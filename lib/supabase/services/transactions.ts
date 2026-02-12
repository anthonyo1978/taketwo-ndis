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
import { sanitizeSearch } from '../../utils/sanitize-search'

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
      if (filters.houseIds && filters.houseIds.length > 0) {
        // Transactions don't have house_id directly — resolve via residents
        const { data: houseResidents } = await supabase
          .from('residents')
          .select('id')
          .in('house_id', filters.houseIds)
        const houseResidentIds = houseResidents?.map(r => r.id) || []
        if (houseResidentIds.length > 0) {
          query = query.in('resident_id', houseResidentIds)
        } else {
          // No residents in these houses → no transactions can match
          query = query.in('resident_id', ['00000000-0000-0000-0000-000000000000'])
        }
      }
      if (filters.statuses && filters.statuses.length > 0) {
        query = query.in('status', filters.statuses)
      }
      if (filters.serviceCode) {
        const safeCode = sanitizeSearch(filters.serviceCode)
        query = query.ilike('service_code', `%${safeCode}%`)
      }
      if (filters.search) {
        // Sanitize and build search term
        const safe = sanitizeSearch(filters.search)
        const searchTerm = `%${safe}%`
        
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
   * Generate the next sequential TXN ID using an atomic Postgres function.
   * Uses pg_advisory_xact_lock to prevent race conditions between concurrent requests.
   * Falls back to application-level logic if the RPC function is not yet deployed.
   * 
   * @param organizationId - Optional organization ID. If not provided, fetches from current user session.
   * @param maxRetries - Maximum retry attempts (used by fallback logic only)
   * @param supabaseClient - Optional Supabase client (for service role access in automation)
   */
  async generateNextTxnId(organizationId?: string, maxRetries: number = 5, supabaseClient?: any): Promise<string> {
    const supabase = supabaseClient || await createClient()
    
    // If organizationId not provided, try to get from session
    const orgId = organizationId || await getCurrentUserOrganizationId()
    
    if (!orgId) {
      throw new Error('User organization not found. Please log in again.')
    }
    
    // Try atomic RPC function first (eliminates race conditions)
    try {
      const { data, error } = await supabase.rpc('generate_next_txn_id', {
        p_organization_id: orgId
      })
      
      if (!error && data) {
        return data as string
      }
      
      // RPC not available yet (migration not run) — fall back to app-level logic
      if (error) {
        console.warn('[TXN ID GEN] RPC not available, using fallback:', error.message)
      }
    } catch {
      console.warn('[TXN ID GEN] RPC call failed, using fallback')
    }
    
    // ── Fallback: application-level ID generation ──
    const orgPrefix = orgId.substring(0, 6).toUpperCase()
    
    const { data, error } = await supabase
      .from('transactions')
      .select('id')
      .like('id', `TXN-${orgPrefix}-%`)
      .eq('organization_id', orgId)
      .order('id', { ascending: false })
      .limit(100)
    
    if (error) {
      console.error('[TXN ID GEN] Error fetching latest TXN ID:', error)
      throw new Error('Failed to generate TXN ID')
    }
    
    if (!data || data.length === 0) {
      return `TXN-${orgPrefix}-A000001`
    }
    
    // Filter for sequential format IDs
    const legacyPattern = /^TXN-[A-Z]\d{6}(-\d+)?$/
    const newPattern = new RegExp(`^TXN-${orgPrefix}-[A-Z]\\d{6}(-\\d+)?$`)
    
    const sequentialIds = data
      .map((item: { id: string }) => item.id)
      .filter((id: string) => legacyPattern.test(id) || newPattern.test(id))
      .map((id: string) => {
        const baseMatch = id.match(/^(TXN-(?:[A-Z0-9]+-)?[A-Z]\d{6})/)
        return baseMatch ? baseMatch[1] : id
      })
      .filter((id: string, index: number, self: string[]) => self.indexOf(id) === index)
      .sort((a: string, b: string) => {
        const aMatch = a.match(/^TXN-(?:[A-Z0-9]+-)?([A-Z])(\d+)$/)
        const bMatch = b.match(/^TXN-(?:[A-Z0-9]+-)?([A-Z])(\d+)$/)
        
        if (!aMatch || !bMatch) return 0
        if (!aMatch[1] || !aMatch[2] || !bMatch[1] || !bMatch[2]) return 0
        
        if (aMatch[1] !== bMatch[1]) {
          return bMatch[1].localeCompare(aMatch[1])
        }
        return parseInt(bMatch[2], 10) - parseInt(aMatch[2], 10)
      })
    
    if (sequentialIds.length === 0) {
      return `TXN-${orgPrefix}-A000001`
    }
    
    const latestId = sequentialIds[0]
    const match = latestId.match(/^TXN-(?:[A-Z0-9]+-)?([A-Z])(\d+)$/)
    
    if (!match) {
      return `TXN-${orgPrefix}-A000001`
    }
    
    const [, letter, numberStr] = match
    let currentLetter = letter
    let currentNumber = parseInt(numberStr, 10)
    
    if (currentNumber >= 999999) {
      currentLetter = String.fromCharCode(currentLetter.charCodeAt(0) + 1)
      currentNumber = 1
    } else {
      currentNumber += 1
    }
    
    return `TXN-${orgPrefix}-${currentLetter}${currentNumber.toString().padStart(6, '0')}`
  }

  /**
   * Create a new transaction
   */
  async create(input: TransactionCreateInput, createdBy: string): Promise<Transaction> {
    // Get current user's organization ID ONCE at the start
    const organizationId = await getCurrentUserOrganizationId()
    
    if (!organizationId) {
      console.error('[TRANSACTION] No organization ID found for user')
      throw new Error('User organization not found. Please log in again.')
    }
    
    
    
    let retryCount = 0
    const maxRetries = 5
    const supabase = await createClient()
    
    while (retryCount < maxRetries) {
      try {
        // Generate sequential TXN ID - regenerate on each retry to avoid collisions
        if (retryCount > 0) {
          
          // Force a small delay to allow other transactions to complete
          await new Promise(resolve => setTimeout(resolve, 100 * retryCount))
        }
        
        const customId = await this.generateNextTxnId(organizationId)
        
        
        // Check if this ID already exists
        const { data: existingTx, error: checkError } = await supabase
          .from('transactions')
          .select('id')
          .eq('id', customId)
          .eq('organization_id', organizationId)
          .maybeSingle()
        
        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is fine
          console.error('[TRANSACTION] Error checking existing ID:', checkError)
          throw checkError
        }
        
        if (existingTx) {
          
          retryCount++
          continue
        }
        
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
          // If duplicate key error, retry
          if (error.code === '23505') {
            
            retryCount++
            await new Promise(resolve => setTimeout(resolve, 100))
            continue
          }
          
          console.error('Error creating transaction:', error)
          throw new Error(`Failed to create transaction: ${error.message}`)
        }
        
        // Success! Create audit trail and update balance
        await this.createAuditEntry(data.id, 'created', createdBy, 'Transaction created', undefined, data)
        
        if (!isOrphaned) {
          await this.updateContractBalance(input.contractId, input.amount || (input.quantity * input.unitPrice), false)
        }
        
        return convertDbTransactionToFrontend(data)
        
      } catch (error) {
        if (retryCount >= maxRetries - 1) {
          console.error('Error in TransactionService.create after max retries:', error)
          throw error
        }
        retryCount++
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    throw new Error('Failed to create transaction after maximum retries')
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
      
      
      
      // Calculate new balance
      let newBalance: number
      if (isRefund) {
        // Refund: add back to balance, but don't exceed original amount
        newBalance = Math.min(contract.original_amount, contract.current_balance + amount)
      } else {
        // Deduct: subtract from balance, but don't go below 0
        newBalance = Math.max(0, contract.current_balance - amount)
      }
      
      
      
      // Update contract balance
      const { error: updateError } = await supabase
        .from('funding_contracts')
        .update({ current_balance: newBalance })
        .eq('id', contractId)
      
      if (updateError) {
        console.error('Error updating contract balance:', updateError)
      } else {
        
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
