import { z } from 'zod'

/** All valid property categories */
const PROPERTY_CATEGORIES = [
  'head_lease', 'utilities', 'maintenance', 'cleaning', 'insurance',
  'compliance', 'repairs', 'other',
  // Legacy
  'rent', 'rates', 'management_fee',
] as const

/** All valid organisation categories */
const ORGANISATION_CATEGORIES = [
  'salaries', 'software', 'office_rent', 'marketing', 'accounting',
  'corporate_insurance', 'vehicles', 'other',
] as const

/** All categories combined */
const ALL_CATEGORIES = [...PROPERTY_CATEGORIES, ...ORGANISATION_CATEGORIES] as const

export const houseExpenseSchema = z.object({
  scope: z.enum(['property', 'organisation']),
  houseId: z.string().uuid('Invalid house ID').optional().or(z.literal('')).or(z.literal(undefined as unknown as string)),
  headLeaseId: z.string().uuid('Invalid lease ID').optional().or(z.literal('')),
  category: z.enum(ALL_CATEGORIES, {
    errorMap: () => ({ message: 'Please select a category' })
  }),
  description: z.string().min(1, 'Description is required').max(500),
  reference: z.string().max(100).optional().or(z.literal('')),
  supplier: z.string().max(200).optional().or(z.literal('')),
  amount: z.coerce.number().min(0, 'Amount cannot be negative'),
  frequency: z.enum(['one_off', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'annually']).optional(),
  occurredAt: z.coerce.date({ errorMap: () => ({ message: 'Please select a date' }) }),
  dueDate: z.coerce.date().optional().nullable(),
  status: z.enum(['draft', 'approved', 'paid', 'overdue', 'cancelled']),
  notes: z.string().max(1000).optional().or(z.literal('')),
  documentUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  isSnapshot: z.boolean().optional(),
  meterReading: z.coerce.number().min(0, 'Reading cannot be negative').optional().nullable(),
  readingUnit: z.string().max(20).optional().or(z.literal('')),
}).refine((data) => {
  // Property expenses must have a houseId
  if (data.scope === 'property' && (!data.houseId || data.houseId === '')) {
    return false
  }
  return true
}, {
  message: 'Property expenses must be assigned to a house',
  path: ['houseId'],
})

export type HouseExpenseSchemaType = z.infer<typeof houseExpenseSchema>

export { PROPERTY_CATEGORIES, ORGANISATION_CATEGORIES, ALL_CATEGORIES }
