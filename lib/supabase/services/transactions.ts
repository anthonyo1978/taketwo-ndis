import { createClient } from '../server'
import type { 
  Transaction, 
  TransactionCreateInput, 
  TransactionUpdateInput,
  TransactionFilters,
  TransactionListResponse,
  TransactionSortConfig,
  TransactionAuditEntry
} from 'types/transaction'
import { getCurrentUserOrganizationId } from '../../utils/organization'

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
        .select(`
          *,
          claims!transactions_claim_id_fkey (
            claim_number
          )
        `, { count: 'exact' })

      // Apply filters
      if (filters.dateRange?.from) {
        query = query.gte('occurred_at', filters.dateRange.from.toISOString())
      }
      if (filters.dateRange?.to) {
        // Add end of day to make the date range inclusive
        const endOfDay = new Date(filters.dateRange.to)
        endOfDay.setHours(23, 59, 59, 999)
        query = query.lte('occurred_at', endOfDay.toISOString())
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
        // For search, we need to use a different approach since we need to search resident names
        // We'll use a text search that includes resident information
        const searchTerm = `%${filters.search}%`
        
        // First, get resident IDs that match the search term
        const { data: matchingResidents } = await supabase
          .from('residents')
          .select('id')
          .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`)
        
        const residentIds = matchingResidents?.map(r => r.id) || []
        
        // Now search in transaction fields and include matching residents
        if (residentIds.length > 0) {
          query = query.or(`description.ilike.${searchTerm},note.ilike.${searchTerm},resident_id.in.(${residentIds.join(',')})`)
        } else {
          query = query.or(`description.ilike.${searchTerm},note.ilike.${searchTerm}`)
        }
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
        hasMore: (page * pageSize) < (count || 0),
        page,
        pageSize
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
        .select(`
          *,
          claims!transactions_claim_id_fkey (
            claim_number
          )
        `)
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
  async generateNextTxnId(): Promise<string> {
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
      // Get current user's organization ID
      const organizationId = await getCurrentUserOrganizationId()
      
      if (!organizationId) {
        throw new Error('User organization not found. Please log in again.')
      }
      
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
      // Add organization context
      dbTransaction.organization_id = organizationId

      const { data, error } = await supabase
        .from('transactions')
        .insert(dbTransaction)
        .select()
        .single()

      if (error) {
        console.error('Error creating transaction:', error)
        throw new Error(`Failed to create transaction: ${error.message}`)
      }

      // Create audit trail entry for creation
      await this.createAuditEntry(data.id, 'created', createdBy, 'Transaction created', undefined, data)

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
   * Create an audit trail entry for transaction changes
   */
  private async createAuditEntry(
    transactionId: string,
    action: 'created' | 'updated' | 'posted' | 'voided',
    userId: string,
    comment: string,
    previousValues?: any,
    newValues?: any
  ): Promise<void> {
    try {
      const supabase = await createClient()
      
      // Determine which fields changed
      const changedFields: string[] = []
      if (previousValues && newValues) {
        const fieldsToCheck = ['service_code', 'note', 'quantity', 'unit_price', 'amount', 'occurred_at', 'status']
        fieldsToCheck.forEach(field => {
          if (previousValues[field] !== newValues[field]) {
            changedFields.push(field)
          }
        })
      }
      
      const auditEntry = {
        transaction_id: transactionId,
        action,
        timestamp: new Date().toISOString(),
        user_id: userId,
        user_email: userId, // For now, using userId as email
        comment,
        changed_fields: changedFields,
        previous_values: previousValues ? JSON.stringify(previousValues) : null,
        new_values: newValues ? JSON.stringify(newValues) : null
      }
      
      const { error } = await supabase
        .from('transaction_audit_trail')
        .insert(auditEntry)
      
      if (error) {
        console.error('Error creating audit entry:', error)
        // Don't throw here - audit failure shouldn't break the main operation
      }
    } catch (error) {
      console.error('Error in createAuditEntry:', error)
      // Don't throw here - audit failure shouldn't break the main operation
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
  async update(id: string, updates: TransactionUpdateInput, updatedBy: string): Promise<Transaction> {
    try {
      const supabase = await createClient()
      
      // Validate audit comment requirement
      if (!updates.auditComment || updates.auditComment.length < 10) {
        throw new Error('Audit comment is required and must be at least 10 characters long')
      }
      
      // Get the original transaction to compare changes
      const { data: originalTransaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !originalTransaction) {
        throw new Error('Transaction not found')
      }

      // Extract audit comment and remove it from updates
      const { auditComment, ...transactionUpdates } = updates
      const dbUpdates = convertFrontendTransactionToDb(transactionUpdates, updatedBy, true)

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

      // Create audit trail entry
      await this.createAuditEntry(id, 'updated', updatedBy, auditComment, originalTransaction, data)

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
   * Get audit trail for a transaction
   */
  async getAuditTrail(transactionId: string): Promise<TransactionAuditEntry[]> {
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('transaction_audit_trail')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('timestamp', { ascending: false })
      
      if (error) {
        console.error('Error fetching audit trail:', error)
        throw new Error(`Failed to fetch audit trail: ${error.message}`)
      }
      
      return (data || []).map(entry => ({
        id: entry.id,
        action: entry.action,
        field: entry.field,
        oldValue: entry.old_value,
        newValue: entry.new_value,
        timestamp: new Date(entry.timestamp),
        userId: entry.user_id,
        userEmail: entry.user_email,
        comment: entry.comment,
        changedFields: entry.changed_fields || [],
        previousValues: entry.previous_values ? JSON.parse(entry.previous_values) as Partial<Transaction> : undefined,
        newValues: entry.new_values ? JSON.parse(entry.new_values) as Partial<Transaction> : undefined
      }))
    } catch (error) {
      console.error('Error in getAuditTrail:', error)
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
    description: transaction.note,
    quantity: transaction.quantity,
    unit_price: transaction.unitPrice,
    amount: transaction.amount,
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
    note: dbTransaction.description,
    quantity: parseFloat(dbTransaction.quantity),
    unitPrice: parseFloat(dbTransaction.unit_price),
    amount: parseFloat(dbTransaction.amount),
    status: dbTransaction.status,
    claimId: dbTransaction.claim_id,
    claimNumber: dbTransaction.claims?.claim_number,
    drawdownStatus: dbTransaction.drawdown_status,
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
