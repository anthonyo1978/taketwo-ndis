import { z } from 'zod'

export const ownerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200, 'Name must be less than 200 characters'),
  ownerType: z.enum(['individual', 'company', 'trust', 'other'], {
    errorMap: () => ({ message: 'Please select a valid owner type' })
  }),
  primaryContactName: z.string().max(200, 'Contact name must be less than 200 characters').optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().max(50, 'Phone must be less than 50 characters').optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional()
})

export type OwnerSchemaType = z.infer<typeof ownerSchema>

