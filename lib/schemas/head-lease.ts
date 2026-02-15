import { z } from 'zod'

export const headLeaseSchema = z.object({
  houseId: z.string().uuid('Invalid house ID'),
  ownerId: z.string().uuid('Invalid owner ID'),
  reference: z.string().max(100, 'Reference must be less than 100 characters').optional(),
  startDate: z.coerce.date({
    errorMap: () => ({ message: 'Please select a valid start date' })
  }),
  endDate: z.coerce.date().optional().nullable(),
  status: z.enum(['active', 'upcoming', 'expired'], {
    errorMap: () => ({ message: 'Please select a valid status' })
  }),
  rentAmount: z.coerce.number().min(0, 'Rent amount must be positive').optional().nullable(),
  rentFrequency: z.enum(['weekly', 'fortnightly', 'monthly'], {
    errorMap: () => ({ message: 'Please select a valid rent frequency' })
  }),
  reviewDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
  documentUrl: z.string().url('Invalid URL').optional().or(z.literal(''))
})

export type HeadLeaseSchemaType = z.infer<typeof headLeaseSchema>

