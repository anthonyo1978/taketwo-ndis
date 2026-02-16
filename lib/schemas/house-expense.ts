import { z } from 'zod'

export const houseExpenseSchema = z.object({
  houseId: z.string().uuid('Invalid house ID'),
  headLeaseId: z.string().uuid('Invalid lease ID').optional().or(z.literal('')),
  category: z.enum(['rent', 'maintenance', 'insurance', 'utilities', 'rates', 'management_fee', 'other'], {
    errorMap: () => ({ message: 'Please select a category' })
  }),
  description: z.string().min(1, 'Description is required').max(500),
  reference: z.string().max(100).optional().or(z.literal('')),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  frequency: z.enum(['one_off', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'annually']).optional(),
  occurredAt: z.coerce.date({ errorMap: () => ({ message: 'Please select a date' }) }),
  dueDate: z.coerce.date().optional().nullable(),
  status: z.enum(['draft', 'approved', 'paid', 'overdue', 'cancelled']),
  notes: z.string().max(1000).optional().or(z.literal('')),
  documentUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
})

export type HouseExpenseSchemaType = z.infer<typeof houseExpenseSchema>

