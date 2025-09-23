import { z } from "zod"

// Automation settings schema
export const automationSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  runTime: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Run time must be in HH:MM format")
    .default("02:00"),
  timezone: z.string()
    .min(1, "Timezone is required")
    .default("Australia/Sydney"),
  adminEmails: z.array(z.string().email("Invalid email address"))
    .min(1, "At least one admin email is required")
    .default([]),
  notificationSettings: z.object({
    onSuccess: z.boolean().default(true),
    onPartial: z.boolean().default(true),
    onFailure: z.boolean().default(true),
    weeklySummary: z.boolean().default(true)
  }).default({
    onSuccess: true,
    onPartial: true,
    onFailure: true,
    weeklySummary: true
  }),
  errorHandling: z.object({
    maxRetries: z.number()
      .min(0, "Max retries cannot be negative")
      .max(10, "Max retries cannot exceed 10")
      .default(3),
    retryDelayMs: z.number()
      .min(1000, "Retry delay must be at least 1 second")
      .max(60000, "Retry delay cannot exceed 60 seconds")
      .default(5000),
    continueOnError: z.boolean().default(true)
  }).default({
    maxRetries: 3,
    retryDelayMs: 5000,
    continueOnError: true
  })
})

// Automation settings input schema (for updates)
export const automationSettingsInputSchema = z.object({
  enabled: z.boolean().optional(),
  runTime: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Run time must be in HH:MM format")
    .optional(),
  timezone: z.string().min(1, "Timezone is required").optional(),
  adminEmails: z.array(z.string().email("Invalid email address")).optional(),
  notificationSettings: z.object({
    onSuccess: z.boolean().optional(),
    onPartial: z.boolean().optional(),
    onFailure: z.boolean().optional(),
    weeklySummary: z.boolean().optional()
  }).optional(),
  errorHandling: z.object({
    maxRetries: z.number()
      .min(0, "Max retries cannot be negative")
      .max(10, "Max retries cannot exceed 10")
      .optional(),
    retryDelayMs: z.number()
      .min(1000, "Retry delay must be at least 1 second")
      .max(60000, "Retry delay cannot exceed 60 seconds")
      .optional(),
    continueOnError: z.boolean().optional()
  }).optional()
})

// Automation error schema
export const automationErrorSchema = z.object({
  contractId: z.string().min(1, "Contract ID is required"),
  residentName: z.string().min(1, "Resident name is required"),
  reason: z.string().min(1, "Error reason is required"),
  timestamp: z.coerce.date()
})

// Automation log schema
export const automationLogSchema = z.object({
  id: z.string().optional(),
  runDate: z.coerce.date(),
  status: z.enum(['success', 'partial', 'failed']),
  contractsProcessed: z.number().min(0, "Contracts processed cannot be negative"),
  contractsSkipped: z.number().min(0, "Contracts skipped cannot be negative"),
  contractsFailed: z.number().min(0, "Contracts failed cannot be negative"),
  executionTimeMs: z.number().min(0, "Execution time cannot be negative"),
  errors: z.array(automationErrorSchema).default([]),
  summary: z.string().optional()
})

// Billing run result schema
export const billingRunResultSchema = z.object({
  success: z.boolean(),
  contractsProcessed: z.number().min(0),
  contractsSkipped: z.number().min(0),
  contractsFailed: z.number().min(0),
  totalAmount: z.number().min(0),
  errors: z.array(automationErrorSchema),
  executionTimeMs: z.number().min(0),
  summary: z.string()
})

// Eligible contract schema
export const eligibleContractSchema = z.object({
  contractId: z.string().min(1),
  residentId: z.string().min(1),
  residentName: z.string().min(1),
  houseAddress: z.string().min(1),
  currentBalance: z.number().min(0),
  runAmount: z.number().min(0),
  nextRunDate: z.coerce.date(),
  frequency: z.enum(['daily', 'weekly', 'fortnightly']),
  supportItemCode: z.string().optional()
})

// Frequency calculation schema
export const frequencyCalculationSchema = z.object({
  nextRunDate: z.coerce.date(),
  daysUntilNext: z.number().min(0)
})
