/**
 * House Expense type definitions for business outgoings/costs per property.
 * These sit on the opposite side of the balance sheet from resident income transactions.
 */

/** Valid expense categories */
export type ExpenseCategory = 'rent' | 'maintenance' | 'insurance' | 'utilities' | 'rates' | 'management_fee' | 'other'

/** Valid expense frequencies */
export type ExpenseFrequency = 'one_off' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually'

/** Valid expense statuses */
export type ExpenseStatus = 'draft' | 'approved' | 'paid' | 'overdue' | 'cancelled'

/** Human-readable labels */
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: 'Rent',
  maintenance: 'Maintenance',
  insurance: 'Insurance',
  utilities: 'Utilities',
  rates: 'Rates & Levies',
  management_fee: 'Management Fee',
  other: 'Other',
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
 * Complete house expense record
 */
export interface HouseExpense {
  id: string
  organizationId: string
  houseId: string
  headLeaseId?: string
  category: ExpenseCategory
  description: string
  reference?: string
  amount: number
  frequency?: ExpenseFrequency
  occurredAt: Date
  dueDate?: Date
  paidAt?: Date
  status: ExpenseStatus
  notes?: string
  documentUrl?: string
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  updatedBy?: string
}

/**
 * Input for creating a new house expense
 */
export interface HouseExpenseCreateInput {
  houseId: string
  headLeaseId?: string
  category: ExpenseCategory
  description: string
  reference?: string
  amount: number
  frequency?: ExpenseFrequency
  occurredAt: Date | string
  dueDate?: Date | string
  status?: ExpenseStatus
  notes?: string
  documentUrl?: string
}

/**
 * Input for updating an existing house expense
 */
export interface HouseExpenseUpdateInput {
  category?: ExpenseCategory
  description?: string
  reference?: string
  amount?: number
  frequency?: ExpenseFrequency
  occurredAt?: Date | string
  dueDate?: Date | string
  paidAt?: Date | string
  status?: ExpenseStatus
  notes?: string
  documentUrl?: string
}

