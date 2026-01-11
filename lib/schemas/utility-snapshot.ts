import { z } from "zod"

export const utilitySnapshotCreateSchema = z.object({
  propertyId: z.string().uuid("Invalid property ID"),
  
  utilityType: z.enum(['electricity', 'water'] as const, {
    errorMap: () => ({ message: "Utility type must be electricity or water" })
  }),
  
  onCharge: z.boolean(),
  
  meterReading: z.number()
    .nonnegative("Meter reading must be positive")
    .optional(),
  
  readingUnit: z.string()
    .max(20, "Reading unit must be no more than 20 characters")
    .optional(),
  
  readingAt: z.coerce.date().optional(),
  
  notes: z.string()
    .max(500, "Notes must be no more than 500 characters")
    .optional()
})

export const utilitySnapshotUpdateSchema = z.object({
  notes: z.string()
    .max(500, "Notes must be no more than 500 characters")
    .optional()
})

export type UtilitySnapshotCreateSchemaType = z.infer<typeof utilitySnapshotCreateSchema>
export type UtilitySnapshotUpdateSchemaType = z.infer<typeof utilitySnapshotUpdateSchema>

