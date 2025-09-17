/** Gender options for residents. */
export type Gender = 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say'

/** Status options for residents. */
export type ResidentStatus = 'Prospect' | 'Active' | 'Deactivated'

/** Types of funding available for residents. */
export type FundingType = 'NDIS' | 'Government' | 'Private' | 'Family' | 'Other'

/** Status options for funding contracts. */
export type ContractStatus = 'Draft' | 'Active' | 'Expired' | 'Cancelled' | 'Renewed'

/** Drawdown rate options for funding contracts. */
export type DrawdownRate = 'daily' | 'weekly' | 'monthly'

/**
 * Information about a resident's funding contract.
 */
export interface FundingInformation {
  id: string
  type: FundingType
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
  drawdownRate: DrawdownRate
  autoDrawdown: boolean
  lastDrawdownDate?: Date
  renewalDate?: Date
  parentContractId?: string
  // Support item fields
  supportItemCode?: string
  dailySupportItemCost?: number
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
  fundingInformation: FundingInformation[]
  preferences: ResidentPreferences
  detailedNotes?: string
  emergencyContact?: EmergencyContact
  auditTrail: AuditLogEntry[]
  createdAt: Date
  createdBy: string
  updatedAt: Date
  updatedBy: string
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
  firstName?: string
  lastName?: string
  phone?: string
  email?: string
  ndisId?: string
  photoBase64?: string
  status?: ResidentStatus
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