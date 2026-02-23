/* ───── Automation Types ───── */

export type AutomationType = 'recurring_transaction' | 'contract_billing_run'
export type AutomationRunStatus = 'running' | 'success' | 'failed'
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly'

export interface AutomationSchedule {
  frequency: ScheduleFrequency
  timeOfDay: string          // "HH:MM"
  timezone: string           // IANA e.g. "Australia/Sydney"
  dayOfWeek?: number         // 0–6 (for weekly)
  dayOfMonth?: number        // 1–31 (for monthly)
}

/** Parameters for recurring_transaction runner */
export interface RecurringTransactionParams {
  /** ID of the expense to clone each period */
  templateExpenseId?: string
  /** ID of the NDIS transaction to clone each period */
  templateTransactionId?: string
  /** Direction: income or expense */
  direction?: 'income' | 'expense'
  /** Scope: property or organisation (expenses only) */
  scope?: 'property' | 'organisation'
}

/** Parameters for contract_billing_run runner */
export interface ContractBillingParams {
  notifyEmails?: string[]
  catchUpMode?: boolean
}

export type AutomationParameters = RecurringTransactionParams | ContractBillingParams

export interface Automation {
  id: string
  organizationId: string
  name: string
  description?: string
  type: AutomationType
  isEnabled: boolean
  schedule: AutomationSchedule
  parameters: AutomationParameters
  lastRunAt?: Date | null
  nextRunAt?: Date | null
  lastRunStatus?: 'success' | 'failed' | null
  createdByUserId?: string
  createdAt: Date
  updatedAt: Date
}

export interface AutomationCreateInput {
  name: string
  description?: string
  type: AutomationType
  isEnabled?: boolean
  schedule: AutomationSchedule
  parameters: AutomationParameters
}

export interface AutomationUpdateInput {
  name?: string
  description?: string
  isEnabled?: boolean
  schedule?: Partial<AutomationSchedule>
  parameters?: Partial<AutomationParameters>
}

export interface AutomationRun {
  id: string
  automationId: string
  organizationId: string
  startedAt: Date
  finishedAt?: Date | null
  status: AutomationRunStatus
  summary?: string
  metrics?: Record<string, any>
  error?: Record<string, any> | string | null
  createdAt: Date
}

/* ───── Schedule helpers ───── */

export const FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

export const DAY_OF_WEEK_LABELS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
]

export const AUTOMATION_TYPE_LABELS: Record<AutomationType, string> = {
  recurring_transaction: 'Recurring Transaction',
  contract_billing_run: 'Contract Billing Run',
}

export const AUTOMATION_TYPE_DESCRIPTIONS: Record<AutomationType, string> = {
  recurring_transaction: 'Automatically generates a transaction on schedule from a template',
  contract_billing_run: 'Nightly scan of funding contracts to generate NDIS drawdown transactions',
}

/**
 * Produce a human-readable schedule description.
 */
export function describeSchedule(s: AutomationSchedule): string {
  const time = s.timeOfDay || '02:00'
  switch (s.frequency) {
    case 'daily':
      return `Daily at ${time}`
    case 'weekly': {
      const day = s.dayOfWeek != null ? DAY_OF_WEEK_LABELS[s.dayOfWeek] : 'Monday'
      return `Every ${day} at ${time}`
    }
    case 'monthly': {
      const dom = s.dayOfMonth ?? 1
      const suffix = dom === 1 ? 'st' : dom === 2 ? 'nd' : dom === 3 ? 'rd' : 'th'
      return `Monthly on the ${dom}${suffix} at ${time}`
    }
    default:
      return `${s.frequency} at ${time}`
  }
}
