/** Gender options for residents. */
export type Gender = 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say'

/** Status options for residents. */
export type ResidentStatus = 'Prospect' | 'Active' | 'Deactivated'

/** Funding model types for residents. */
export type FundingModel = 'Draw Down' | 'Capture & Invoice' | 'Hybrid'

/** Funding management types for residents. */
export type FundingManagementType = 'ndia' | 'plan_managed' | 'self_managed' | 'unknown'

/** Status options for funding contracts. */
export type ContractStatus = 'Draft' | 'Active' | 'Expired' | 'Cancelled' | 'Renewed'

/** Legacy drawdown rate options for funding contracts. */
export type DrawdownRate = 'daily' | 'weekly' | 'monthly'

/** Automated drawdown frequency options for funding contracts. */
export type AutomatedDrawdownFrequency = 'daily' | 'weekly' | 'fortnightly'

/**
 * Information about a resident's funding contract.
 */
export interface FundingInformation {
  id: string
  type: FundingModel
  amount: number
  startDate: Date
  endDate?: Date
  description?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  // Contract-specific fields
  contractStatus: ContractStatus
  originalAmount: number
  currentBalance: number
  drawdownRate: DrawdownRate // Legacy field, use automatedDrawdownFrequency
  autoDrawdown: boolean
  lastDrawdownDate?: Date
  renewalDate?: Date
  parentContractId?: string
  // Support item fields
  supportItemCode?: string
  dailySupportItemCost?: number
  // Automation fields
  autoBillingEnabled: boolean
  automatedDrawdownFrequency: AutomatedDrawdownFrequency
  nextRunDate?: Date
  firstRunDate?: Date
  // Duration field
  durationDays?: number
}

/**
 * Resident preferences and requirements.
 */
export interface ResidentPreferences {
  dietary?: string[]
  medical?: string[]
  accessibility?: string[]
  communication?: string[]
  social?: string[]
  other?: string
}

/**
 * Emergency contact information for a resident.
 */
export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  email?: string
}

/**
 * Audit log entry for tracking changes to resident data.
 */
export interface AuditLogEntry {
  id: string
  residentId: string
  action: string
  field?: string
  oldValue?: string
  newValue?: string
  timestamp: Date
  userId: string
  userEmail: string
}

/**
 * Complete resident information including personal details and funding.
 */
export interface Resident {
  id: string
  houseId: string
  house?: {
    id: string
    name: string
    address1: string
    address2?: string
    city: string
    state: string
    postcode: string
  }
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender: Gender
  phone?: string
  email?: string
  ndisId?: string
  photoBase64?: string
  notes?: string
  status: ResidentStatus
  roomLabel?: string
  moveInDate?: Date
  participantFundingLevelLabel?: string
  participantFundingLevelNotes?: string
  fundingManagementType?: FundingManagementType
  planManagerId?: string | null
  planManager?: {
    id: string
    name: string
    email?: string
    phone?: string
    billingEmail?: string
  } | null
  gtaReference?: string
  gtaStartDate?: Date
  gtaEndDate?: Date
  fundingInformation: FundingInformation[]
  preferences: ResidentPreferences
  detailedNotes?: string
  emergencyContact?: EmergencyContact
  auditTrail: AuditLogEntry[]
  createdAt: Date
  createdBy: string
  updatedAt: Date
  updatedBy: string
  // Raw funding_contracts from DB join (for billing status checks)
  funding_contracts?: Array<{
    id: string
    contract_status: string
    current_balance: number
  }>
}

/**
 * Input data for creating a new resident.
 */
export interface ResidentCreateInput {
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender: Gender
  phone?: string
  email?: string
  ndisId?: string
  photoBase64?: string
  notes?: string
  status?: ResidentStatus
  preferences?: ResidentPreferences
  emergencyContact?: EmergencyContact
}

/**
 * Input data for updating an existing resident.
 */
export interface ResidentUpdateInput {
  houseId?: string | null
  firstName?: string
  lastName?: string
  phone?: string
  email?: string
  ndisId?: string
  photoBase64?: string
  status?: ResidentStatus
  roomLabel?: string
  moveInDate?: Date
  participantFundingLevelLabel?: string
  participantFundingLevelNotes?: string
  fundingManagementType?: FundingManagementType
  planManagerId?: string | null
  gtaReference?: string
  gtaStartDate?: Date
  gtaEndDate?: Date
  detailedNotes?: string
  preferences?: ResidentPreferences
  emergencyContact?: EmergencyContact
}

/**
 * Summary of contract balances across multiple contracts.
 */
export interface ContractBalanceSummary {
  totalOriginal: number
  totalCurrent: number
  totalDrawnDown: number
  activeContracts: number
  expiringSoon: number
}

/**
 * Automation error details for logging.
 */
export interface AutomationError {
  contractId: string
  residentName: string
  reason: string
  timestamp: Date
}

/**
 * Log entry for automated billing batch job executions.
 */
export interface AutomationLog {
  id: string
  runDate: Date
  status: 'success' | 'partial' | 'failed'
  contractsProcessed: number
  contractsSkipped: number
  contractsFailed: number
  executionTimeMs: number
  errors: AutomationError[]
  summary?: string
  createdAt: Date
}