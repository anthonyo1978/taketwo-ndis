/**
 * Catch-up Transaction Generator Service
 * 
 * Generates retrospective transactions when a contract's Next Run Date is in the past.
 * Used for backdated contracts or when automation was missed.
 */

import { createClient } from '../supabase/server'
import { transactionService } from '../supabase/services/transactions'

export interface CatchupGenerationResult {
  success: boolean
  transactionsCreated: number
  transactions: Array<{
    id: string
    date: string
    amount: number
  }>
  warnings?: string[]
  error?: string
}

interface CatchupGenerationOptions {
  contractId: string
  residentId: string
  nextRunDate: Date
  frequency: 'daily' | 'weekly' | 'fortnightly'
  amount: number
  currentBalance: number
  startDate: Date
  createdBy: string
}

/**
 * Calculate all billing dates between nextRunDate and today
 */
function calculateBillingDates(
  startDate: Date,
  frequency: 'daily' | 'weekly' | 'fortnightly',
  maxDates: number = 50
): Date[] {
  const dates: Date[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  let currentDate = new Date(startDate)
  currentDate.setHours(0, 0, 0, 0)
  
  const incrementDays = frequency === 'daily' ? 1 : frequency === 'weekly' ? 7 : 14
  
  while (currentDate <= today && dates.length < maxDates) {
    dates.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + incrementDays)
  }
  
  return dates
}

/**
 * Generate catch-up transactions for a contract
 */
export async function generateCatchupTransactions(
  options: CatchupGenerationOptions
): Promise<CatchupGenerationResult> {
  const {
    contractId,
    residentId,
    nextRunDate,
    frequency,
    amount,
    currentBalance,
    startDate,
    createdBy
  } = options
  
  const warnings: string[] = []
  
  // Validate that nextRunDate is in the past
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextRun = new Date(nextRunDate)
  nextRun.setHours(0, 0, 0, 0)
  
  if (nextRun >= today) {
    return {
      success: true,
      transactionsCreated: 0,
      transactions: [],
      warnings: ['Next run date is not in the past. No catch-up transactions needed.']
    }
  }
  
  // Calculate all billing dates
  const billingDates = calculateBillingDates(nextRun, frequency, 50)
  
  if (billingDates.length === 0) {
    return {
      success: true,
      transactionsCreated: 0,
      transactions: [],
      warnings: ['No billing dates calculated. Check your next run date and frequency.']
    }
  }
  
  // Check if we have enough balance for all catch-ups
  const totalRequired = billingDates.length * amount
  if (totalRequired > currentBalance) {
    warnings.push(
      `⚠️ Insufficient balance: Need $${totalRequired.toFixed(2)} but only $${currentBalance.toFixed(2)} available. ` +
      `Some transactions may fail when posted.`
    )
  }
  
  // Generate sequential transaction IDs
  const supabase = await createClient()
  const createdTransactions: Array<{ id: string; date: string; amount: number }> = []
  
  try {
    for (const billingDate of billingDates) {
      // Generate next transaction ID
      const txnId = await transactionService.generateNextTxnId()
      
      // Create transaction in draft status
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert({
          txn_id: txnId,
          resident_id: residentId,
          contract_id: contractId,
          amount: amount,
          quantity: 1,
          unit_price: amount,
          status: 'draft',
          drawdown_status: 'pending',
          occurred_at: billingDate.toISOString(),
          note: `Catch-up billing for ${billingDate.toLocaleDateString()}`,
          created_by: createdBy,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        console.error('[CATCHUP] Failed to create transaction:', error)
        return {
          success: false,
          transactionsCreated: createdTransactions.length,
          transactions: createdTransactions,
          error: `Failed to create transaction for ${billingDate.toLocaleDateString()}: ${error.message}`,
          warnings
        }
      }
      
      createdTransactions.push({
        id: transaction.id,
        date: billingDate.toISOString().split('T')[0] as string,
        amount: amount
      })
    }
    
    console.log(`[CATCHUP] Created ${createdTransactions.length} catch-up transactions for contract ${contractId}`)
    
    return {
      success: true,
      transactionsCreated: createdTransactions.length,
      transactions: createdTransactions,
      warnings: warnings.length > 0 ? warnings : undefined
    }
    
  } catch (error) {
    console.error('[CATCHUP] Unexpected error:', error)
    return {
      success: false,
      transactionsCreated: createdTransactions.length,
      transactions: createdTransactions,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      warnings
    }
  }
}

/**
 * Calculate how many catch-up transactions would be generated (for preview/validation)
 */
export function calculateCatchupCount(
  nextRunDate: Date,
  frequency: 'daily' | 'weekly' | 'fortnightly'
): number {
  const dates = calculateBillingDates(nextRunDate, frequency, 50)
  return dates.length
}

/**
 * Validate if catch-up generation is feasible
 */
export function validateCatchupGeneration(
  nextRunDate: Date,
  startDate: Date,
  frequency: 'daily' | 'weekly' | 'fortnightly'
): { valid: boolean; error?: string; warning?: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const nextRun = new Date(nextRunDate)
  nextRun.setHours(0, 0, 0, 0)
  
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  
  // Check if next run date is before start date
  if (nextRun < start) {
    return {
      valid: false,
      error: 'Next run date cannot be before contract start date'
    }
  }
  
  // Check if next run date is in the future
  if (nextRun >= today) {
    return {
      valid: true,
      warning: 'Next run date is not in the past. No catch-up transactions will be generated.'
    }
  }
  
  // Calculate how many transactions would be generated
  const count = calculateCatchupCount(nextRun, frequency)
  
  if (count > 50) {
    return {
      valid: false,
      error: `Too many catch-up transactions required (${count}). Maximum is 50. Please adjust your next run date.`
    }
  }
  
  if (count === 0) {
    return {
      valid: true,
      warning: 'No catch-up transactions will be generated based on the current dates.'
    }
  }
  
  return { valid: true }
}

