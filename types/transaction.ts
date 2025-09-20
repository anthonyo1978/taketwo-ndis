/** Status options for transactions. */
export type TransactionStatus = 'draft' | 'posted' | 'voided'

/** Drawing Down specific status for NDIS compliance. */
export type DrawdownStatus = 'pending' | 'validated' | 'posted' | 'rejected' | 'voided'

/**
 * Complete transaction information including Drawing Down fields.
 */
export interface Transaction {
  id: string
  residentId: string
  contractId: string
  occurredAt: Date
  serviceCode?: string // Made optional for backward compatibility
  description?: string
  quantity: number
  unitPrice: number
  amount: number // quantity * unitPrice (can be overridden)
  status: TransactionStatus
  drawdownStatus?: DrawdownStatus // Optional for backward compatibility
  note?: string
  createdAt: Date
  createdBy: string
  postedAt?: Date
  postedBy?: string
  voidedAt?: Date
  voidedBy?: string
  voidReason?: string
  
  // Drawing Down specific fields for NDIS compliance (all optional for backward compatibility)
  supportAgreementId?: string // Link to specific support agreement
  participantId?: string // Direct participant reference (same as residentId but explicit)
  serviceItemCode?: string // NDIS service item code (required for new transactions)
  isDrawdownTransaction?: boolean // Flag for mandatory drawdown validation
  isOrphaned?: boolean // Flag for transactions outside contract date boundaries
  drawdownValidation?: {
    isValid: boolean
    validationErrors: string[]
    validatedAt: Date
    validatedBy: string
  }
  auditTrail?: TransactionAuditEntry[] // Immutable audit trail (optional for backward compatibility)
}

/**
 * Input data for creating a new transaction.
 */
export interface TransactionCreateInput {
  residentId: string
  contractId: string
  occurredAt: Date
  serviceCode: string
  serviceItemCode?: string // Optional for regular transactions, required for Drawing Down
  description?: string
  quantity: number
  unitPrice: number
  amount?: number // Optional override
  note?: string
  supportAgreementId?: string
  isDrawdownTransaction?: boolean // Defaults to true for Drawing Down
  isOrphaned?: boolean // Indicates if transaction is outside contract date boundaries
}

/**
 * Audit log entry for tracking transaction changes.
 */
export interface TransactionAuditEntry {
  id: string
  action: 'created' | 'validated' | 'posted' | 'voided' | 'balance_updated'
  field?: string
  oldValue?: string
  newValue?: string
  timestamp: Date
  userId: string
  userEmail: string
  reason?: string
}

/**
 * Result of Drawing Down validation for a transaction.
 */
export interface DrawdownValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  balanceImpact: ContractBalanceImpact
  canProceed: boolean
}

/**
 * Rule definition for mandatory Drawing Down validation.
 */
export interface MandatoryDrawdownRule {
  ruleId: string
  description: string
  validate: (transaction: Transaction, contract: any) => { isValid: boolean; error?: string }
  isMandatory: boolean
}

/**
 * Input data for updating an existing transaction.
 */
export interface TransactionUpdateInput {
  occurredAt?: Date
  serviceCode?: string
  description?: string
  quantity?: number
  unitPrice?: number
  amount?: number
  note?: string
}

/**
 * Filter criteria for transaction queries.
 */
export interface TransactionFilters {
  dateRange?: { from: Date; to: Date }
  residentIds?: string[]
  contractIds?: string[]
  houseIds?: string[]
  statuses?: TransactionStatus[]
  serviceCode?: string
  search?: string
}

/**
 * Sorting configuration for transaction queries.
 */
export interface TransactionSortConfig {
  field: keyof Transaction | 'residentName' | 'houseName' | 'contractType'
  direction: 'asc' | 'desc'
}

/**
 * Response data for paginated transaction lists.
 */
export interface TransactionListResponse {
  transactions: Transaction[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * Configuration for bulk transaction operations.
 */
export interface BulkTransactionOperation {
  transactionIds: string[]
  action: 'post' | 'void'
  reason?: string // Required for void operations
}

/**
 * Result of bulk transaction operations.
 */
export interface BulkOperationResult {
  success: boolean
  processed: number
  failed: number
  errors: Array<{ transactionId: string; error: string }>
}

/**
 * Preview of balance impact for a transaction.
 */
export interface TransactionBalancePreview {
  currentBalance: number
  transactionAmount: number
  remainingAfterPost: number
  canPost: boolean
  warningMessage?: string
}

/**
 * Common service codes for NDIS providers.
 */
export const COMMON_SERVICE_CODES = [
  { code: 'SDA_RENT', label: 'SDA Rent', description: 'Specialist Disability Accommodation rental' },
  { code: 'SIL_SUPPORT', label: 'SIL Support', description: 'Supported Independent Living hours' },
  { code: 'CORE_SUPPORT', label: 'Core Support', description: 'Core supports and services' },
  { code: 'CAPACITY_BUILDING', label: 'Capacity Building', description: 'Capacity building supports' },
  { code: 'TRANSPORT', label: 'Transport', description: 'Transportation assistance' },
  { code: 'EQUIPMENT', label: 'Equipment', description: 'Assistive technology and equipment' },
  { code: 'THERAPY', label: 'Therapy', description: 'Allied health and therapy services' },
  { code: 'RESPITE', label: 'Respite', description: 'Short-term accommodation and respite' },
  { code: 'OTHER', label: 'Other', description: 'Other approved NDIS services' }
] as const

/**
 * Type for valid service codes.
 */
export type ServiceCode = typeof COMMON_SERVICE_CODES[number]['code']

/**
 * Balance summary for resident pages.
 */
export interface ResidentBalanceSummary {
  residentId: string
  activeContracts: Array<{
    contractId: string
    type: string
    originalAmount: number
    currentBalance: number
    recentTransactionCount: number
  }>
  totalAllocated: number
  totalRemaining: number
  totalSpent: number
}

/**
 * Recent transactions summary for resident pages.
 */
export interface RecentTransactionsSummary {
  residentId: string
  transactions: Transaction[]
  totalCount: number
  hasMore: boolean
}

/**
 * Impact of a transaction on contract balance.
 */
export interface ContractBalanceImpact {
  contractId: string
  currentBalance: number
  impactAmount: number
  newBalance: number
  isValid: boolean
  errorMessage?: string
}