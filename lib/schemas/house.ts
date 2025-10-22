import { z } from "zod"

export const houseCreateSchema = z.object({
  descriptor: z.string()
    .min(3, "House descriptor must be at least 3 characters")
    .max(100, "House descriptor must be no more than 100 characters")
    .optional(),
  
  address1: z.string()
    .min(3, "Address must be at least 3 characters")
    .max(120, "Address must be no more than 120 characters"),
  
  unit: z.string().optional(),
  
  suburb: z.string()
    .min(1, "Suburb/City is required")
    .max(100, "Suburb/City must be no more than 100 characters"),
  
  state: z.enum(['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'] as const, {
    errorMap: () => ({ message: "Please select a valid Australian state" })
  }),
  
  postcode: z.string()
    .regex(/^\d{4}$/, "Postcode must be exactly 4 digits"),
  
  country: z.string()
    .default("AU")
    .optional(),
  
  status: z.enum(['Active', 'Vacant', 'Maintenance'] as const, {
    errorMap: () => ({ message: "Please select a valid status" })
  }),
  
  notes: z.string().optional(),
  
  goLiveDate: z.coerce.date({
    errorMap: () => ({ message: "Please select a valid go-live date" })
  }),
  
  imageUrl: z.string().url("Must be a valid image URL").optional()
})

export const houseSchema = houseCreateSchema.extend({
  id: z.string(),
  createdAt: z.date(),
  createdBy: z.string(),
  updatedAt: z.date(),
  updatedBy: z.string()
})

export type HouseCreateSchemaType = z.infer<typeof houseCreateSchema>
export type HouseSchemaType = z.infer<typeof houseSchema>