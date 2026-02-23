/**
 * Expense type definitions for business outgoings/costs.
 * Supports both property-level expenses (tagged to a house) and
 * organisation-level expenses (not tagged to any house).
 */

/** Expense scope */
export type ExpenseScope = 'property' | 'organisation'

/** Property-level expense categories */
export type PropertyExpenseCategory =
  | 'head_lease'
  | 'utilities'
  | 'maintenance'
  | 'cleaning'
  | 'insurance'
  | 'compliance'
  | 'repairs'
  | 'other'
  // Legacy categories (backward compat)
  | 'rent'
  | 'rates'
  | 'management_fee'

/** Organisation-level expense categories */
export type OrganisationExpenseCategory =
  | 'salaries'
  | 'software'
  | 'office_rent'
  | 'marketing'
  | 'accounting'
  | 'corporate_insurance'
  | 'vehicles'
  | 'other'

/** All expense categories (union) */
export type ExpenseCategory = PropertyExpenseCategory | OrganisationExpenseCategory

/** Valid expense frequencies */
export type ExpenseFrequency = 'one_off' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually'

/** Valid expense statuses */
export type ExpenseStatus = 'draft' | 'approved' | 'paid' | 'overdue' | 'cancelled'

/** Human-readable labels for property categories */
export const PROPERTY_CATEGORY_LABELS: Record<PropertyExpenseCategory, string> = {
  head_lease: 'Head Lease',
  utilities: 'Utilities',
  maintenance: 'Maintenance',
  cleaning: 'Cleaning',
  insurance: 'Insurance',
  compliance: 'Compliance',
  repairs: 'Repairs',
  other: 'Other',
  // Legacy
  rent: 'Rent',
  rates: 'Rates & Levies',
  management_fee: 'Management Fee',
}

/** Human-readable labels for organisation categories */
export const ORGANISATION_CATEGORY_LABELS: Record<OrganisationExpenseCategory, string> = {
  salaries: 'Salaries',
  software: 'Software',
  office_rent: 'Office Rent',
  marketing: 'Marketing',
  accounting: 'Accounting',
  corporate_insurance: 'Corporate Insurance',
  vehicles: 'Vehicles',
  other: 'Other',
}

/** All category labels (merged) */
export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  ...PROPERTY_CATEGORY_LABELS,
  ...ORGANISATION_CATEGORY_LABELS,
}

export const EXPENSE_FREQUENCY_LABELS: Record<ExpenseFrequency, string> = {
  one_off: 'One-off',
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
}

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
}

/**
 * Complete expense record (property or organisation level)
 */
export interface HouseExpense {
  id: string
  organizationId: string
  /** Null for organisation-scoped expenses */
  houseId: string | null
  headLeaseId?: string
  scope: ExpenseScope
  category: ExpenseCategory
  description: string
  reference?: string
  supplier?: string
  amount: number
  frequency?: ExpenseFrequency
  occurredAt: Date
  dueDate?: Date
  paidAt?: Date
  status: ExpenseStatus
  notes?: string
  documentUrl?: string
  /** Whether this expense is a point-in-time snapshot/reading (e.g. meter reading) */
  isSnapshot?: boolean
  /** Meter reading value at time of expense */
  meterReading?: number
  /** Unit of measurement for meter reading (e.g. kWh, kL, GB) */
  readingUnit?: string
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  updatedBy?: string
  /** Joined house name (when fetched with house join) */
  houseName?: string
}

/**
 * Input for creating a new expense
 */
export interface HouseExpenseCreateInput {
  scope?: ExpenseScope
  /** Required for property scope, null/omitted for organisation scope */
  houseId?: string | null
  headLeaseId?: string
  category: ExpenseCategory
  description: string
  reference?: string
  supplier?: string
  amount: number
  frequency?: ExpenseFrequency
  occurredAt: Date | string
  dueDate?: Date | string
  status?: ExpenseStatus
  notes?: string
  documentUrl?: string
  isSnapshot?: boolean
  meterReading?: number
  readingUnit?: string
}

/**
 * Input for updating an existing expense
 */
export interface HouseExpenseUpdateInput {
  scope?: ExpenseScope
  houseId?: string | null
  category?: ExpenseCategory
  description?: string
  reference?: string
  supplier?: string
  amount?: number
  frequency?: ExpenseFrequency
  occurredAt?: Date | string
  dueDate?: Date | string
  paidAt?: Date | string
  status?: ExpenseStatus
  notes?: string
  documentUrl?: string
}
