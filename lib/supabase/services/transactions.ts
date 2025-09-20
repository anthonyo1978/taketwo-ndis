import { createClient } from '../server'
import type { 
  Transaction, 
  TransactionCreateInput, 
  TransactionFilters,
  TransactionListResponse,
  TransactionSortConfig
} from 'types/transaction'

export class TransactionService {
  /**
   * Get all transactions with optional filtering and pagination
   */
  async getAll(
    filters: TransactionFilters = {},
    sortConfig: TransactionSortConfig = { field: 'occurredAt', direction: 'desc' },
    page: number = 1,
    pageSize: number = 25
  ): Promise<TransactionListResponse> {
    try {
      const supabase = await createClient()
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })

      // Apply filters
      if (filters.dateRange?.from) {
        query = query.gte('occurred_at', filters.dateRange.from.toISOString())
      }
      if (filters.dateRange?.to) {
        query = query.lte('occurred_at', filters.dateRange.to.toISOString())
      }
      if (filters.residentIds && filters.residentIds.length > 0) {
        query = query.in('resident_id', filters.residentIds)
      }
      if (filters.contractIds && filters.contractIds.length > 0) {
        query = query.in('contract_id', filters.contractIds)
      }
      if (filters.statuses && filters.statuses.length > 0) {
        query = query.in('status', filters.statuses)
      }
      if (filters.serviceCode) {
        query = query.ilike('service_code', `%${filters.serviceCode}%`)
      }
      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,note.ilike.%${filters.search}%`)
      }

      // Apply sorting - convert camelCase to snake_case for database columns
      const dbField = convertFieldToDb(sortConfig.field)
      query = query.order(dbField, { ascending: sortConfig.direction === 'asc' })

      // Apply pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching transactions:', error)
        throw new Error(`Failed to fetch transactions: ${error.message}`)
      }

      // Convert database format to frontend format
      const transactions: Transaction[] = (data || []).map(convertDbTransactionToFrontend)

      return {
        transactions,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    } catch (error) {
      console.error('Error in TransactionService.getAll:', error)
      throw error
    }
  }

  /**
   * Get a single transaction by ID
   */
  async getById(id: string): Promise<Transaction | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        console.error('Error fetching transaction:', error)
        throw new Error(`Failed to fetch transaction: ${error.message}`)
      }

      return convertDbTransactionToFrontend(data)
    } catch (error) {
      console.error('Error in TransactionService.getById:', error)
      throw error
    }
  }

  /**
   * Generate the next sequential TXN ID
   */
  private async generateNextTxnId(): Promise<string> {
    const supabase = await createClient()
    
    // Get all TXN IDs and filter for sequential format
    const { data, error } = await supabase
      .from('transactions')
      .select('id')
      .like('id', 'TXN-%')
      .order('id', { ascending: false })
      .limit(100)
    
    if (error) {
      console.error('Error fetching latest TXN ID:', error)
      throw new Error('Failed to generate TXN ID')
    }
    
    if (!data || data.length === 0) {
      // First transaction
      return 'TXN-A000001'
    }
    
    // Filter for sequential format IDs (TXN-A000001, TXN-B000001, etc.)
    const sequentialIds = data
      .map(item => item.id)
      .filter(id => /^TXN-[A-Z]\d{6}$/.test(id))
      .sort((a, b) => {
        // Sort by letter first, then by number
        const aMatch = a.match(/^TXN-([A-Z])(\d+)$/)
        const bMatch = b.match(/^TXN-([A-Z])(\d+)$/)
        
        if (!aMatch || !bMatch) return 0
        
        const [, aLetter, aNum] = aMatch
        const [, bLetter, bNum] = bMatch
        
        if (aLetter !== bLetter) {
          return bLetter.localeCompare(aLetter) // Z comes before A
        }
        
        return parseInt(bNum) - parseInt(aNum) // Higher numbers first
      })
    
    if (sequentialIds.length === 0) {
      // No sequential format found, start with A000001
      return 'TXN-A000001'
    }
    
    // Get the highest sequential ID
    const latestId = sequentialIds[0] // Now properly sorted descending
    const match = latestId.match(/^TXN-([A-Z])(\d+)$/)
    
    if (!match) {
      // This shouldn't happen since we filtered, but just in case
      return 'TXN-A000001'
    }
    
    const [, letter, numberStr] = match
    let currentLetter = letter
    let currentNumber = parseInt(numberStr, 10)
    
    // Check if we need to move to next letter (assuming 999999 is the max per letter)
    if (currentNumber >= 999999) {
      currentLetter = String.fromCharCode(currentLetter.charCodeAt(0) + 1)
      currentNumber = 1
    } else {
      currentNumber += 1
    }
    
    return `TXN-${currentLetter}${currentNumber.toString().padStart(6, '0')}`
  }

  /**
   * Create a new transaction
   */
  async create(input: TransactionCreateInput, createdBy: string): Promise<Transaction> {
    try {
      const supabase = await createClient()
      
      // Generate sequential TXN ID
      const customId = await this.generateNextTxnId()
      
      // Check if transaction is orphaned (outside contract date boundaries)
      const isOrphaned = await this.checkIfTransactionIsOrphaned(input)
      
      // Add orphaned status to input
      const inputWithOrphaned = {
        ...input,
        isOrphaned
      }
      
      const dbTransaction = convertFrontendTransactionToDb(inputWithOrphaned, createdBy)
      // Override the ID with our custom TXN prefixed ID
      dbTransaction.id = customId

      const { data, error } = await supabase
        .from('transactions')
        .insert(dbTransaction)
        .select()
        .single()

      if (error) {
        console.error('Error creating transaction:', error)
        throw new Error(`Failed to create transaction: ${error.message}`)
      }

      // Update contract balance if transaction is not orphaned
      if (!isOrphaned) {
        await this.updateContractBalance(input.contractId, input.amount || (input.quantity * input.unitPrice), false)
      }

      return convertDbTransactionToFrontend(data)
    } catch (error) {
      console.error('Error in TransactionService.create:', error)
      throw error
    }
  }

  /**
   * Check if a transaction is orphaned (outside contract date boundaries)
   */
  private async checkIfTransactionIsOrphaned(input: TransactionCreateInput): Promise<boolean> {
    try {
      const supabase = await createClient()
      
      // Get the contract details
      const { data: contract, error } = await supabase
        .from('funding_contracts')
        .select('start_date, end_date')
        .eq('id', input.contractId)
        .single()
      
      if (error || !contract) {
        console.error('Error fetching contract for orphaned check:', error)
        return false // Default to not orphaned if we can't check
      }
      
      const transactionDate = new Date(input.occurredAt)
      const contractStart = contract.start_date ? new Date(contract.start_date) : null
      const contractEnd = contract.end_date ? new Date(contract.end_date) : null
      
      // Check if transaction is outside contract boundaries
      if (contractStart && transactionDate < contractStart) {
        return true
      }
      
      if (contractEnd && transactionDate > contractEnd) {
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error checking if transaction is orphaned:', error)
      return false // Default to not orphaned on error
    }
  }

  /**
   * Update contract balance by deducting or adding transaction amount
   */
  private async updateContractBalance(contractId: string, amount: number, isRefund: boolean = false): Promise<void> {
    try {
      const supabase = await createClient()
      
      // Get current contract balance
      const { data: contract, error: fetchError } = await supabase
        .from('funding_contracts')
        .select('current_balance, original_amount')
        .eq('id', contractId)
        .single()
      
      if (fetchError || !contract) {
        console.error('Error fetching contract for balance update:', fetchError)
        return
      }
      
      console.log(`Contract ${contractId} balance update:`)
      console.log(`  Current balance: $${contract.current_balance}`)
      console.log(`  Original amount: $${contract.original_amount}`)
      console.log(`  Transaction amount: $${amount}`)
      console.log(`  Operation: ${isRefund ? 'REFUND (adding back)' : 'DEDUCT (subtracting)'}`)
      
      // Calculate new balance
      let newBalance: number
      if (isRefund) {
        // Refund: add back to balance, but don't exceed original amount
        newBalance = Math.min(contract.original_amount, contract.current_balance + amount)
      } else {
        // Deduct: subtract from balance, but don't go below 0
        newBalance = Math.max(0, contract.current_balance - amount)
      }
      
      console.log(`  New balance: $${newBalance}`)
      
      // Update contract balance
      const { error: updateError } = await supabase
        .from('funding_contracts')
        .update({ current_balance: newBalance })
        .eq('id', contractId)
      
      if (updateError) {
        console.error('Error updating contract balance:', updateError)
      } else {
        console.log(`  ✅ Contract balance updated successfully`)
      }
    } catch (error) {
      console.error('Error in updateContractBalance:', error)
    }
  }

  /**
   * Update an existing transaction
   */
  async update(id: string, updates: Partial<TransactionCreateInput>, updatedBy: string): Promise<Transaction> {
    try {
      const supabase = await createClient()
      
      // Get the original transaction to compare changes
      const { data: originalTransaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !originalTransaction) {
        throw new Error('Transaction not found')
      }

      const dbUpdates = convertFrontendTransactionToDb(updates, updatedBy, true)

      const { data, error } = await supabase
        .from('transactions')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating transaction:', error)
        throw new Error(`Failed to update transaction: ${error.message}`)
      }

      const updatedTransaction = convertDbTransactionToFrontend(data)

      // Handle contract balance updates if amount changed and transaction is not orphaned
      const originalAmount = originalTransaction.amount
      const newAmount = updatedTransaction.amount
      const isOrphaned = updatedTransaction.isOrphaned || false

      if (originalAmount !== newAmount && !isOrphaned && originalTransaction.contract_id) {
        const amountDifference = newAmount - originalAmount
        
        // If amount increased, deduct the difference
        // If amount decreased, add back the difference
        if (amountDifference !== 0) {
          await this.updateContractBalance(originalTransaction.contract_id, Math.abs(amountDifference), amountDifference < 0)
        }
      }

      return updatedTransaction
    } catch (error) {
      console.error('Error in TransactionService.update:', error)
      throw error
    }
  }

  /**
   * Delete a transaction
   */
  async delete(id: string): Promise<void> {
    try {
      const supabase = await createClient()
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting transaction:', error)
        throw new Error(`Failed to delete transaction: ${error.message}`)
      }
    } catch (error) {
      console.error('Error in TransactionService.delete:', error)
      throw error
    }
  }

  /**
   * Update transaction status (post/void)
   */
  async updateStatus(id: string, status: 'posted' | 'voided', updatedBy: string, voidReason?: string): Promise<Transaction> {
    try {
      const supabase = await createClient()
      const updates: any = {
        status,
        updated_at: new Date().toISOString()
      }

      if (status === 'posted') {
        updates.posted_at = new Date().toISOString()
        updates.posted_by = updatedBy
      } else if (status === 'voided') {
        updates.voided_at = new Date().toISOString()
        updates.voided_by = updatedBy
        if (voidReason) {
          updates.void_reason = voidReason
        }
      }

      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating transaction status:', error)
        throw new Error(`Failed to update transaction status: ${error.message}`)
      }

      return convertDbTransactionToFrontend(data)
    } catch (error) {
      console.error('Error in TransactionService.updateStatus:', error)
      throw error
    }
  }
}

// Helper function to convert camelCase field names to snake_case for database
function convertFieldToDb(field: string): string {
  const fieldMap: Record<string, string> = {
    'occurredAt': 'occurred_at',
    'residentId': 'resident_id',
    'contractId': 'contract_id',
    'serviceCode': 'service_code',
    'serviceItemCode': 'service_item_code',
    'unitPrice': 'unit_price',
    'supportAgreementId': 'support_agreement_id',
    'isDrawdownTransaction': 'is_drawdown_transaction',
    'createdAt': 'created_at',
    'createdBy': 'created_by',
    'postedAt': 'posted_at',
    'postedBy': 'posted_by',
    'voidedAt': 'voided_at',
    'voidedBy': 'voided_by',
    'voidReason': 'void_reason',
    'updatedAt': 'updated_at'
  }
  return fieldMap[field] || field
}

// Helper functions to convert between database and frontend formats
function convertFrontendTransactionToDb(
  transaction: TransactionCreateInput | Partial<TransactionCreateInput>, 
  userId: string,
  isUpdate: boolean = false
): any {
  const dbTransaction: any = {
    resident_id: transaction.residentId,
    contract_id: transaction.contractId,
    occurred_at: transaction.occurredAt?.toISOString(),
    service_code: transaction.serviceCode,
    service_item_code: transaction.serviceItemCode,
    description: transaction.description,
    quantity: transaction.quantity,
    unit_price: transaction.unitPrice,
    amount: transaction.amount,
    note: transaction.note,
    support_agreement_id: transaction.supportAgreementId,
    is_drawdown_transaction: transaction.isDrawdownTransaction || false,
    is_orphaned: transaction.isOrphaned || false
  }

  if (!isUpdate) {
    dbTransaction.created_by = userId
  }

  // Remove undefined values
  Object.keys(dbTransaction).forEach(key => {
    if (dbTransaction[key] === undefined) {
      delete dbTransaction[key]
    }
  })

  return dbTransaction
}

function convertDbTransactionToFrontend(dbTransaction: any): Transaction {
  return {
    id: dbTransaction.id,
    residentId: dbTransaction.resident_id,
    contractId: dbTransaction.contract_id,
    occurredAt: new Date(dbTransaction.occurred_at),
    serviceCode: dbTransaction.service_code,
    serviceItemCode: dbTransaction.service_item_code,
    description: dbTransaction.description,
    quantity: parseFloat(dbTransaction.quantity),
    unitPrice: parseFloat(dbTransaction.unit_price),
    amount: parseFloat(dbTransaction.amount),
    status: dbTransaction.status,
    drawdownStatus: dbTransaction.drawdown_status,
    note: dbTransaction.note,
    supportAgreementId: dbTransaction.support_agreement_id,
    isDrawdownTransaction: dbTransaction.is_drawdown_transaction,
    isOrphaned: dbTransaction.is_orphaned || false,
    createdAt: new Date(dbTransaction.created_at),
    createdBy: dbTransaction.created_by,
    postedAt: dbTransaction.posted_at ? new Date(dbTransaction.posted_at) : undefined,
    postedBy: dbTransaction.posted_by,
    voidedAt: dbTransaction.voided_at ? new Date(dbTransaction.voided_at) : undefined,
    voidedBy: dbTransaction.voided_by,
    voidReason: dbTransaction.void_reason
  }
}

// Export a singleton instance
export const transactionService = new TransactionService()
