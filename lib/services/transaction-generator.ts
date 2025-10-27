import { createClient } from '../supabase/server'
import { getEligibleContracts, ContractEligibilityResult } from './contract-eligibility'
import { getTransactionAmount } from './contract-rate-calculator'
import { transactionService } from '../supabase/services/transactions'

export interface TransactionGenerationResult {
  success: boolean
  processedContracts: number
  successfulTransactions: number
  failedTransactions: number
  transactions: GeneratedTransaction[]
  errors: TransactionError[]
  summary: {
    totalAmount: number
    averageAmount: number
    frequencyBreakdown: Record<string, number>
  }
}

export interface GeneratedTransaction {
  id: string
  contractId: string
  residentId: string
  amount: number
  frequency: string
  transactionDate: string
  description: string
  isAutomated: boolean
  automationRunId: string
}

export interface TransactionError {
  contractId: string
  residentId: string
  error: string
  details?: any
}

/**
 * Generate transactions for all eligible contracts
 * 
 * @param timezone - IANA timezone string (e.g., "Australia/Sydney"). If not provided, fetches from database.
 */
export async function generateTransactionsForEligibleContracts(timezone?: string, organizationId?: string): Promise<TransactionGenerationResult> {
  try {
    // Get all eligible contracts for this organization
    const eligibleContracts = await getEligibleContracts(timezone, organizationId)
    
    if (eligibleContracts.length === 0) {
      return {
        success: true,
        processedContracts: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        transactions: [],
        errors: [],
        summary: {
          totalAmount: 0,
          averageAmount: 0,
          frequencyBreakdown: {}
        }
      }
    }
    
    const results: TransactionGenerationResult = {
      success: true,
      processedContracts: eligibleContracts.length,
      successfulTransactions: 0,
      failedTransactions: 0,
      transactions: [],
      errors: [],
      summary: {
        totalAmount: 0,
        averageAmount: 0,
        frequencyBreakdown: {}
      }
    }
    
    // Process each eligible contract
    for (const eligibleContract of eligibleContracts) {
      const residentName = `${eligibleContract.resident.first_name} ${eligibleContract.resident.last_name}`
      
      try {
        console.log(`[TRANSACTION GEN] Processing ${residentName} (contract: ${eligibleContract.contractId})`)
        const transactionResult = await generateTransactionForContract(eligibleContract)
        
        if (transactionResult.success) {
          console.log(`[TRANSACTION GEN] ✅ Success for ${residentName}`)
          results.successfulTransactions++
          results.transactions.push(transactionResult.transaction!)
          results.summary.totalAmount += transactionResult.transaction!.amount
          
          // Update frequency breakdown
          const freq = transactionResult.transaction!.frequency
          results.summary.frequencyBreakdown[freq] = (results.summary.frequencyBreakdown[freq] || 0) + 1
        } else {
          console.error(`[TRANSACTION GEN] ❌ Failed for ${residentName}:`, transactionResult.error)
          console.error(`[TRANSACTION GEN] Error details:`, transactionResult.details)
          results.failedTransactions++
          results.errors.push({
            contractId: eligibleContract.contractId,
            residentId: eligibleContract.resident.id,
            error: transactionResult.error || 'Unknown error',
            details: transactionResult.details
          })
        }
      } catch (error) {
        console.error(`[TRANSACTION GEN] ❌ Exception for ${residentName}:`, error)
        results.failedTransactions++
        results.errors.push({
          contractId: eligibleContract.contractId,
          residentId: eligibleContract.resident.id,
          error: 'Transaction generation failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Calculate average amount
    if (results.successfulTransactions > 0) {
      results.summary.averageAmount = results.summary.totalAmount / results.successfulTransactions
    }
    
    return results
    
  } catch (error) {
    return {
      success: false,
      processedContracts: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      transactions: [],
      errors: [{
        contractId: 'unknown',
        residentId: 'unknown',
        error: 'Failed to generate transactions',
        details: error instanceof Error ? error.message : 'Unknown error'
      }],
      summary: {
        totalAmount: 0,
        averageAmount: 0,
        frequencyBreakdown: {}
      }
    }
  }
}

/**
 * Generate a single transaction for a contract
 */
export async function generateTransactionForContract(
  eligibleContract: ContractEligibilityResult
): Promise<{
  success: boolean
  transaction?: GeneratedTransaction
  error?: string
  details?: any
}> {
  try {
    console.log(`[TRANSACTION] Starting generation for contract ${eligibleContract.contractId}`)
    const supabase = await createClient()
    const contract = eligibleContract.contract
    const resident = eligibleContract.resident
    
    console.log(`[TRANSACTION] Contract details:`, {
      frequency: contract.automated_drawdown_frequency,
      dailyCost: contract.daily_support_item_cost,
      currentBalance: contract.current_balance
    })
    
    // Calculate transaction amount
    const transactionAmount = getTransactionAmount(
      contract.automated_drawdown_frequency as 'daily' | 'weekly' | 'fortnightly',
      contract.daily_support_item_cost || 0
    )
    
    console.log(`[TRANSACTION] Calculated transaction amount:`, transactionAmount)
    
    if (transactionAmount <= 0) {
      console.error(`[TRANSACTION] Invalid transaction amount:`, transactionAmount)
      return {
        success: false,
        error: 'Invalid transaction amount',
        details: { dailyRate: contract.daily_support_item_cost, frequency: contract.automated_drawdown_frequency }
      }
    }
    
    // Check if contract has sufficient balance
    if (contract.current_balance < transactionAmount) {
      console.error(`[TRANSACTION] Insufficient balance:`, {
        currentBalance: contract.current_balance,
        transactionAmount
      })
      return {
        success: false,
        error: 'Insufficient contract balance',
        details: { currentBalance: contract.current_balance, transactionAmount }
      }
    }
    
    // Generate unique sequential TXN ID (same as manual transactions)
    const transactionId = await transactionService.generateNextTxnId()
    console.log(`[TRANSACTION] Generated transaction ID:`, transactionId)
    const automationLogId = generateId()
    const now = new Date()
    
    // Check if this transaction ID already exists (could happen if automation runs twice)
    const { data: existingTransaction } = await supabase
      .from('transactions')
      .select('id')
      .eq('id', transactionId)
      .single()
    
    if (existingTransaction) {
      console.error(`[TRANSACTION] Transaction ID ${transactionId} already exists! This should not happen.`)
      return {
        success: false,
        error: 'Transaction ID collision',
        details: { transactionId, message: 'Generated ID already exists in database. This indicates a race condition or duplicate automation run.' }
      }
    }
    
    // Create transaction record in DRAFT status (requires manual approval)
    const transactionData = {
      id: transactionId, // Uses TXN-A000001 format (same as manual transactions)
      resident_id: resident.id,
      contract_id: contract.id,
      amount: transactionAmount,
      occurred_at: now.toISOString(),
      description: `Automated ${contract.automated_drawdown_frequency} drawdown - ${contract.type}`,
      quantity: 1,
      unit_price: transactionAmount,
      status: 'draft', // Draft status - requires manual approval
      drawdown_status: 'pending', // Pending until validated and posted (NOT 'draft' - that's not in the constraint)
      is_drawdown_transaction: true,
      created_by: 'automation-system',
      posted_at: null, // Not posted yet
      posted_by: null // Not posted yet
    }
    
    // Insert transaction
    console.log(`[TRANSACTION] Inserting transaction:`, transactionData)
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert(transactionData)
    
    if (transactionError) {
      console.error(`[TRANSACTION] Failed to insert transaction:`, transactionError)
      return {
        success: false,
        error: 'Failed to create transaction',
        details: transactionError
      }
    }
    
    console.log(`[TRANSACTION] Transaction inserted successfully`)
    
    // Update contract balance and next run date
    console.log(`[TRANSACTION] Updating contract balance and next run date`)
    const newBalance = contract.current_balance - transactionAmount
    const nextRunDate = calculateNextRunDate(
      new Date(contract.next_run_date!),
      contract.automated_drawdown_frequency as 'daily' | 'weekly' | 'fortnightly'
    )
    
    console.log(`[TRANSACTION] New balance:`, newBalance)
    console.log(`[TRANSACTION] Next run date:`, nextRunDate.toISOString().split('T')[0])
    
    const { error: contractError } = await supabase
      .from('funding_contracts')
      .update({
        current_balance: newBalance,
        next_run_date: nextRunDate.toISOString().split('T')[0] as string,  // DATE format: YYYY-MM-DD
        last_drawdown_date: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', contract.id)
    
    if (contractError) {
      console.error(`[TRANSACTION] Failed to update contract:`, contractError)
      // If contract update fails, we should rollback the transaction
      await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
      
      return {
        success: false,
        error: 'Failed to update contract',
        details: contractError
      }
    }
    
    console.log(`[TRANSACTION] Contract updated successfully`)
    
    // Create audit log entry
    const auditEntry = {
      id: generateId(),
      resident_id: resident.id,
      action: 'AUTOMATED_TRANSACTION_CREATED',
      field: 'current_balance',
      old_value: contract.current_balance.toString(),
      new_value: newBalance.toString(),
      timestamp: now.toISOString(),
      user_id: 'system',
      user_email: 'automation@system.com',
      details: {
        transaction_id: transactionId,
        automation_log_id: automationLogId,
        frequency: contract.automated_drawdown_frequency,
        transaction_amount: transactionAmount
      }
    }
    
    await supabase
      .from('audit_logs')
      .insert(auditEntry)
    
    return {
      success: true,
        transaction: {
          id: transactionId,
          contractId: contract.id,
          residentId: resident.id,
          amount: transactionAmount,
          frequency: contract.automated_drawdown_frequency,
          transactionDate: now.toISOString(),
          description: transactionData.description,
          isAutomated: true,
          automationRunId: automationLogId
        }
    }
    
  } catch (error) {
    return {
      success: false,
      error: 'Transaction generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Calculate the next run date based on frequency
 */
function calculateNextRunDate(currentDate: Date, frequency: 'daily' | 'weekly' | 'fortnightly'): Date {
  const nextDate = new Date(currentDate)
  
  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1)
      break
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7)
      break
    case 'fortnightly':
      nextDate.setDate(nextDate.getDate() + 14)
      break
  }
  
  return nextDate
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * Preview transactions that would be generated (without actually creating them)
 */
export async function previewTransactionGeneration(): Promise<{
  success: boolean
  eligibleContracts: number
  previewTransactions: Array<{
    contractId: string
    residentName: string
    amount: number
    frequency: string
    currentBalance: number
    newBalance: number
    nextRunDate: string
  }>
  totalAmount: number
  error?: string
}> {
  try {
    const eligibleContracts = await getEligibleContracts()
    
    const previewTransactions = eligibleContracts.map(contract => {
      const transactionAmount = getTransactionAmount(
        contract.contract.automated_drawdown_frequency as 'daily' | 'weekly' | 'fortnightly',
        contract.contract.daily_support_item_cost || 0
      )
      
      const nextRunDate = calculateNextRunDate(
        new Date(contract.contract.next_run_date!),
        contract.contract.automated_drawdown_frequency as 'daily' | 'weekly' | 'fortnightly'
      )
      
      return {
        contractId: contract.contractId,
        residentName: `${contract.resident.first_name} ${contract.resident.last_name}`,
        amount: transactionAmount,
        frequency: contract.contract.automated_drawdown_frequency,
        currentBalance: contract.contract.current_balance,
        newBalance: contract.contract.current_balance - transactionAmount,
        nextRunDate: nextRunDate.toISOString().split('T')[0] as string
      }
    })
    
    const totalAmount = previewTransactions.reduce((sum, t) => sum + t.amount, 0)
    
    return {
      success: true,
      eligibleContracts: eligibleContracts.length,
      previewTransactions,
      totalAmount
    }
    
  } catch (error) {
    return {
      success: false,
      eligibleContracts: 0,
      previewTransactions: [],
      totalAmount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
