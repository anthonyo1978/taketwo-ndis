import { z } from 'zod'

/**
 * Schema for NDIS Service Agreement v1 template variables
 * Ensures all required data is present before rendering PDF
 */
export const ndisServiceAgreementV1Schema = z.object({
  // Provider (Organization)
  provider: z.object({
    name: z.string().min(1, 'Organization name is required'),
    abn: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      suburb: z.string().optional(),
      state: z.string().optional(),
      postcode: z.string().optional(),
      country: z.string().default('Australia')
    }).optional()
  }),
  
  // Participant (Resident)
  participant: z.object({
    fullName: z.string().min(1, 'Participant name is required'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    dateOfBirth: z.string().optional(),
    ndisId: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional()
  }),
  
  // Property (House)
  property: z.object({
    name: z.string().min(1, 'Property name is required'),
    address: z.string().min(1, 'Property address is required'),
    fullAddress: z.string().optional()
  }),
  
  // Agreement (Funding Contract)
  agreement: z.object({
    contractId: z.string(),
    type: z.string().min(1, 'Contract type is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional(),
    totalAmount: z.number().positive('Total amount must be positive'),
    currentBalance: z.number().nonnegative('Current balance must be non-negative'),
    dailyRate: z.number().positive('Daily rate must be positive'),
    frequency: z.string().optional(),
    durationDays: z.number().int().positive().optional()
  }),
  
  // Transaction Totals (for reporting)
  totals: z.object({
    txns7d: z.number().default(0),
    txns30d: z.number().default(0),
    txns12m: z.number().default(0),
    amount7d: z.number().default(0),
    amount30d: z.number().default(0),
    amount12m: z.number().default(0)
  }).default({
    txns7d: 0,
    txns30d: 0,
    txns12m: 0,
    amount7d: 0,
    amount30d: 0,
    amount12m: 0
  }),
  
  // Metadata
  generatedAt: z.string(),
  timezone: z.string().default('Australia/Sydney')
})

export type NdisServiceAgreementV1Vars = z.infer<typeof ndisServiceAgreementV1Schema>

