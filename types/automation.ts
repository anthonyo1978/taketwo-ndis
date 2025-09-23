import { AutomationError } from './resident'

/**
 * Automation settings configuration.
 */
export interface AutomationSettings {
  id: string
  enabled: boolean
  runTime: string // Format: "HH:MM" (e.g., "02:00")
  timezone: string // IANA timezone (e.g., "Australia/Sydney")
  adminEmails: string[] // Email addresses to notify
  notificationSettings: {
    onSuccess: boolean
    onPartial: boolean
    onFailure: boolean
    weeklySummary: boolean
  }
  errorHandling: {
    maxRetries: number
    retryDelayMs: number
    continueOnError: boolean
  }
  createdAt: Date
  updatedAt: Date
}

/**
 * Input for creating or updating automation settings.
 */
export interface AutomationSettingsInput {
  enabled?: boolean
  runTime?: string
  timezone?: string
  adminEmails?: string[]
  notificationSettings?: {
    onSuccess?: boolean
    onPartial?: boolean
    onFailure?: boolean
    weeklySummary?: boolean
  }
  errorHandling?: {
    maxRetries?: number
    retryDelayMs?: number
    continueOnError?: boolean
  }
}

/**
 * Result of an automated billing run.
 */
export interface BillingRunResult {
  success: boolean
  contractsProcessed: number
  contractsSkipped: number
  contractsFailed: number
  totalAmount: number
  errors: AutomationError[]
  executionTimeMs: number
  summary: string
}

/**
 * Contract eligibility for automated billing.
 */
export interface EligibleContract {
  contractId: string
  residentId: string
  residentName: string
  houseAddress: string
  currentBalance: number
  runAmount: number
  nextRunDate: Date
  frequency: AutomatedDrawdownFrequency
  supportItemCode?: string
}

/**
 * Frequency calculation utilities.
 */
export type AutomatedDrawdownFrequency = 'daily' | 'weekly' | 'fortnightly'

export interface FrequencyCalculation {
  nextRunDate: Date
  daysUntilNext: number
}
