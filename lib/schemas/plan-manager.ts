import { z } from "zod"

/**
 * Zod schema for creating a new Plan Manager
 */
export const planManagerCreateSchema = z.object({
  name: z.string()
    .min(1, "Plan Manager name is required")
    .max(100, "Name must be no more than 100 characters"),
  
  email: z.string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal('')),
  
  phone: z.string()
    .max(50, "Phone must be no more than 50 characters")
    .optional()
    .or(z.literal('')),
  
  billingEmail: z.string()
    .email("Please enter a valid billing email address")
    .optional()
    .or(z.literal('')),
  
  notes: z.string()
    .max(500, "Notes must be no more than 500 characters")
    .optional()
    .or(z.literal(''))
})

/**
 * Zod schema for updating an existing Plan Manager
 */
export const planManagerUpdateSchema = z.object({
  name: z.string()
    .min(1, "Plan Manager name is required")
    .max(100, "Name must be no more than 100 characters")
    .optional(),
  
  email: z.string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal('')),
  
  phone: z.string()
    .max(50, "Phone must be no more than 50 characters")
    .optional()
    .or(z.literal('')),
  
  billingEmail: z.string()
    .email("Please enter a valid billing email address")
    .optional()
    .or(z.literal('')),
  
  notes: z.string()
    .max(500, "Notes must be no more than 500 characters")
    .optional()
    .or(z.literal(''))
})

/**
 * Funding management type schema
 */
export const fundingManagementTypeSchema = z.enum(['ndia', 'plan_managed', 'self_managed', 'unknown'] as const)

export type PlanManagerCreateSchemaType = z.infer<typeof planManagerCreateSchema>
export type PlanManagerUpdateSchemaType = z.infer<typeof planManagerUpdateSchema>
export type FundingManagementTypeSchemaType = z.infer<typeof fundingManagementTypeSchema>

