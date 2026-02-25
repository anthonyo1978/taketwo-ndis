/* ───── Automation Types ───── */

export type AutomationType = 'recurring_transaction' | 'contract_billing_run' | 'daily_digest'
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

/** Parameters for daily_digest runner */
export interface DailyDigestParams {
  /** How many days back to look for yesterday snapshot (default 1) */
  lookbackDays?: number
  /** How many days forward for the outlook (default 7) */
  forwardDays?: number
  /** Specific email addresses to send to. If empty/undefined, sends to all org admins. */
  recipientEmails?: string[]
}

export type AutomationParameters = RecurringTransactionParams | ContractBillingParams | DailyDigestParams

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
  contract_billing_run: 'Contract Billing',
  daily_digest: 'Daily Brief',
}

export const AUTOMATION_TYPE_DESCRIPTIONS: Record<AutomationType, string> = {
  recurring_transaction: 'Automatically generates a transaction on schedule from a template',
  contract_billing_run: 'Nightly scan of funding contracts to generate NDIS drawdown transactions',
  daily_digest: 'Executive morning summary emailed daily to all admin users',
}

export const AUTOMATION_TYPE_ICONS: Record<AutomationType, string> = {
  recurring_transaction: '🔁',
  contract_billing_run: '⚡',
  daily_digest: '📊',
}

/**
 * Derive the overall automation health status.
 * - Disabled: isEnabled is false
 * - Broken:   isEnabled but last run failed (or never ran and has no next run)
 * - Active:   isEnabled and either last run succeeded or hasn't run yet with a valid next run
 */
export type AutomationHealthStatus = 'active' | 'broken' | 'disabled'

export function getAutomationHealth(a: Pick<Automation, 'isEnabled' | 'lastRunStatus' | 'nextRunAt'>): AutomationHealthStatus {
  if (!a.isEnabled) return 'disabled'
  if (a.lastRunStatus === 'failed') return 'broken'
  return 'active'
}

export const HEALTH_LABELS: Record<AutomationHealthStatus, string> = {
  active: 'Active',
  broken: 'Broken',
  disabled: 'Disabled',
}

/* ───── Automation Level (scope ring) ───── */

export type AutomationLevel = 'organisation' | 'house' | 'client'

/**
 * Derive the automation level from type + parameters.
 * - Organisation (green):  recurring_transaction with scope=organisation
 * - House (orange):        recurring_transaction with scope=property (or default)
 * - Client (red):          contract_billing_run (bills against participant contracts)
 */
export function getAutomationLevel(a: Pick<Automation, 'type' | 'parameters'>): AutomationLevel {
  if (a.type === 'contract_billing_run') return 'client'
  if (a.type === 'daily_digest') return 'organisation'
  const params = a.parameters as RecurringTransactionParams
  if (params?.scope === 'organisation') return 'organisation'
  return 'house'
}

export const LEVEL_LABELS: Record<AutomationLevel, string> = {
  organisation: 'Organisation',
  house: 'House',
  client: 'Client',
}

export const LEVEL_COLORS: Record<AutomationLevel, { ring: string; bg: string; text: string; dot: string }> = {
  organisation: { ring: 'ring-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  house:        { ring: 'ring-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  client:       { ring: 'ring-red-500',     bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500' },
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
