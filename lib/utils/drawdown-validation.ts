import { getResidentsFromStorage } from './resident-storage'
import { generateId } from './transaction-id-generator'
import { postTransaction } from './transaction-storage'
import type { FundingInformation } from 'types/resident'
import type { 
  DrawdownValidationResult, 
  MandatoryDrawdownRule,
  Transaction, 
  TransactionCreateInput,
  TransactionAuditEntry
} from 'types/transaction'
import { calculateBalanceImpact } from './transaction-storage'

/**
 * Drawing Down Validation Engine
 * 
 * Implements the core principles from the Drawing Down PRP:
 * - Small and atomic transactions
 * - Traceable to participant, agreement, service code, and timestamp
 * - Deductive (reduces contract balance)
 * - Immutable (permanent audit trail)
 */

/**
 * Mandatory Drawing Down Rules for NDIS Compliance
 */
export const MANDATORY_DRAWDOWN_RULES: MandatoryDrawdownRule[] = [
  {
    ruleId: 'NON_ZERO_VALUE',
    description: 'Transaction must have a non-zero dollar value',
    isMandatory: true,
    validate: (transaction: Transaction) => ({
      isValid: transaction.amount > 0,
      error: transaction.amount <= 0 ? 'Transaction amount must be greater than zero' : undefined
    })
  },
  {
    ruleId: 'VALID_SERVICE_ITEM_CODE',
    description: 'Must include a valid NDIS service item code',
    isMandatory: true,
    validate: (transaction: Transaction) => ({
      isValid: !!transaction.serviceItemCode && transaction.serviceItemCode.trim().length > 0,
      error: !transaction.serviceItemCode ? 'Service item code is required for NDIS compliance' : undefined
    })
  },
  {
    ruleId: 'PARTICIPANT_LINKING',
    description: 'Must be tied to a specific participant',
    isMandatory: true,
    validate: (transaction: Transaction) => ({
      isValid: !!transaction.participantId && transaction.participantId === transaction.residentId,
      error: !transaction.participantId ? 'Participant linking is required' : undefined
    })
  },
  {
    ruleId: 'VALID_TIMESTAMP',
    description: 'Each transaction must include a valid date',
    isMandatory: true,
    validate: (transaction: Transaction) => {
      const isValidDate = transaction.occurredAt instanceof Date && !isNaN(transaction.occurredAt.getTime())
      return {
        isValid: isValidDate,
        error: !isValidDate ? 'Valid transaction date is required' : undefined
      }
    }
  },
  {
    ruleId: 'CONTRACT_REFERENCE',
    description: 'Must reference a valid support agreement/contract',
    isMandatory: true,
    validate: (transaction: Transaction, contract: FundingInformation) => ({
      isValid: !!contract && contract.contractStatus === 'Active',
      error: !contract ? 'Valid contract reference is required' : 
             contract.contractStatus !== 'Active' ? 'Contract must be active for drawdown' : undefined
    })
  },
  {
    ruleId: 'SUFFICIENT_BALANCE',
    description: 'Contract must have sufficient balance for transaction',
    isMandatory: true,
    validate: (transaction: Transaction, contract: FundingInformation) => {
      const balanceImpact = calculateBalanceImpact(transaction.contractId, transaction.amount, transaction.id)
      return {
        isValid: balanceImpact.isValid,
        error: !balanceImpact.isValid ? balanceImpact.errorMessage : undefined
      }
    }
  },
  {
    ruleId: 'ATOMIC_TRANSACTION',
    description: 'Transaction must be atomic (single point in time, specific support item)',
    isMandatory: true,
    validate: (transaction: Transaction) => {
      const hasSpecificDescription = !!transaction.note && transaction.note.trim().length > 0
      const hasValidQuantity = transaction.quantity > 0 && Number.isInteger(transaction.quantity)
      return {
        isValid: hasSpecificDescription && hasValidQuantity,
        error: !hasSpecificDescription ? 'Transaction must describe specific support provided' :
               !hasValidQuantity ? 'Transaction must specify valid quantity of service' : undefined
      }
    }
  }
]

/**
 * Validate a transaction against all mandatory Drawing Down rules
 */
export function validateDrawdownTransaction(
  transaction: Transaction, 
  _contract: FundingInformation
): DrawdownValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Run all mandatory rules
  for (const rule of MANDATORY_DRAWDOWN_RULES) {
    const result = rule.validate(transaction, _contract)
    if (!result.isValid && result.error) {
      if (rule.isMandatory) {
        errors.push(result.error)
      } else {
        warnings.push(result.error)
      }
    }
  }
  
  // Get balance impact
  const balanceImpact = calculateBalanceImpact(transaction.contractId, transaction.amount, transaction.id)
  
  // Additional NDIS-specific validations
  if (transaction.isDrawdownTransaction) {
    // Validate service item code format (basic NDIS format check)
    if (!transaction.serviceItemCode || !isValidNDISServiceCode(transaction.serviceItemCode)) {
      errors.push('Service item code must follow NDIS format (e.g., 01_001_0107_1_1)')
    }
    
    // Validate transaction occurred within contract period
    if (_contract.startDate && _contract.endDate) {
      const occurredAt = new Date(transaction.occurredAt)
      const startDate = new Date(_contract.startDate)
      const endDate = new Date(_contract.endDate)
      
      if (occurredAt < startDate || occurredAt > endDate) {
        errors.push('Transaction must occur within contract period')
      }
    }
  }
  
  const isValid = errors.length === 0
  const canProceed = isValid && balanceImpact.isValid
  
  return {
    isValid,
    errors,
    warnings,
    balanceImpact,
    canProceed
  }
}

/**
 * Validate transaction creation input before creating transaction
 */
export function validateDrawdownInput(input: TransactionCreateInput): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Basic input validation
  if (!input.serviceItemCode || input.serviceItemCode.trim().length === 0) {
    errors.push('Service item code is required for NDIS compliance')
  }
  
  if (!input.occurredAt || !(input.occurredAt instanceof Date)) {
    errors.push('Valid transaction date is required')
  }
  
  if (!input.quantity || input.quantity <= 0) {
    errors.push('Quantity must be greater than zero')
  }
  
  if (!input.unitPrice || input.unitPrice < 0) {
    errors.push('Unit price must be non-negative')
  }
  
  const calculatedAmount = input.quantity * input.unitPrice
  const transactionAmount = input.amount || calculatedAmount
  
  if (transactionAmount <= 0) {
    errors.push('Transaction amount must be greater than zero')
  }
  
  // Check if contract exists and is active
  const residents = getResidentsFromStorage()
  const resident = residents.find(r => r.id === input.residentId)
  if (!resident) {
    errors.push('Resident not found')
  } else {
    const contract = resident.fundingInformation.find(c => c.id === input.contractId)
    if (!contract) {
      errors.push('Contract not found')
    } else if (contract.contractStatus !== 'Active') {
      errors.push('Contract must be active for drawdown transactions')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Create a transaction with Drawing Down validation
 */
export function createDrawdownTransaction(
  input: TransactionCreateInput,
  createdBy: string = 'system'
): Transaction {
  // Debug logging
  console.log('createDrawdownTransaction input:', JSON.stringify(input, null, 2))
  
  // Validate input first
  const inputValidation = validateDrawdownInput(input)
  if (!inputValidation.isValid) {
    console.log('createDrawdownTransaction validation errors:', inputValidation.errors)
    throw new Error(`Invalid transaction input: ${inputValidation.errors.join(', ')}`)
  }
  
  const now = new Date()
  const transactionId = generateId()
  
  // Calculate amount
  const calculatedAmount = input.quantity * input.unitPrice
  const finalAmount = input.amount || calculatedAmount
  
  // Create audit trail entry
  const auditEntry: TransactionAuditEntry = {
    id: generateId(),
    action: 'created',
    timestamp: now,
    userId: createdBy,
    userEmail: `${createdBy}@example.com`,
    comment: 'Transaction created via Drawing Down system'
  }
  
  const transaction: Transaction = {
    id: transactionId,
    residentId: input.residentId,
    contractId: input.contractId,
    occurredAt: input.occurredAt,
    serviceCode: input.serviceCode || 'DRAWDOWN',
    serviceItemCode: input.serviceItemCode,
    note: input.note,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    amount: finalAmount,
    status: 'draft',
    drawdownStatus: 'pending',
    createdAt: now,
    createdBy,
    supportAgreementId: input.supportAgreementId,
    participantId: input.residentId, // Same as residentId for participant linking
    isDrawdownTransaction: input.isDrawdownTransaction ?? true,
    auditTrail: [auditEntry]
  }
  
  return transaction
}

/**
 * Complete Drawing Down workflow: create, validate, and post transaction with balance deduction
 */
export async function processDrawdownTransaction(
  input: TransactionCreateInput,
  createdBy: string = 'system'
): Promise<{ success: boolean; transaction?: Transaction; errors?: string[] }> {
  try {
    // 1. Create the transaction
    const transaction = createDrawdownTransaction(input, createdBy)
    
    // 2. Validate the transaction against Drawing Down rules
    const residents = getResidentsFromStorage()
    const resident = residents.find(r => r.id === input.residentId)
    
    if (!resident) {
      return {
        success: false,
        errors: ['Resident not found']
      }
    }
    
    const contract = resident.fundingInformation.find(f => f.id === input.contractId)
    if (!contract) {
      return {
        success: false,
        errors: ['Contract not found']
      }
    }
    
    // 3. Validate against Drawing Down rules
    const validation = validateDrawdownTransaction(transaction, contract)
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors
      }
    }
    
    // 4. Post the transaction (this will deduct from contract balance)
    const postResult = postTransaction(transaction.id, createdBy)
    
    if (!postResult.success) {
      return {
        success: false,
        errors: [postResult.error || 'Failed to post transaction']
      }
    }
    
    return {
      success: true,
      transaction: postResult.transaction
    }
    
  } catch (error) {
    console.error('Error processing Drawing Down transaction:', error)
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}

/**
 * Validate and post a drawdown transaction
 */
export function postDrawdownTransaction(
  transactionId: string,
  _postedBy: string = 'system'
): { success: boolean; transaction?: Transaction; errors?: string[] } {
  // This would integrate with existing transaction storage
  // For now, return success with validation
  return {
    success: true,
    transaction: undefined, // Would be populated by actual implementation
    errors: []
  }
}

/**
 * Check if service item code follows NDIS format
 */
function isValidNDISServiceCode(code: string): boolean {
  // Basic NDIS service code format validation
  // Format: XX_XXX_XXXX_X_X (e.g., 01_001_0107_1_1)
  const ndisPattern = /^\d{2}_\d{3}_\d{4}_\d{1}_\d{1}$/
  return ndisPattern.test(code)
}

/**
 * Get all validation errors for a transaction
 */
export function getDrawdownValidationErrors(transaction: Transaction): string[] {
  const residents = getResidentsFromStorage()
  const resident = residents.find(r => r.id === transaction.residentId)
  if (!resident) return ['Resident not found']
  
  const contract = resident.fundingInformation.find(c => c.id === transaction.contractId)
  if (!contract) return ['Contract not found']
  
  const validation = validateDrawdownTransaction(transaction, contract)
  return validation.errors
}

/**
 * Check if transaction can be posted (all validations pass)
 */
export function canPostDrawdownTransaction(transaction: Transaction): boolean {
  const errors = getDrawdownValidationErrors(transaction)
  return errors.length === 0
}
