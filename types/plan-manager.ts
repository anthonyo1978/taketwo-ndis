/**
 * Plan Manager information for Plan Managed participants.
 * Reference data only - does not drive automated invoicing or claims.
 */
export interface PlanManager {
  id: string
  organizationId: string
  name: string
  email?: string
  phone?: string
  billingEmail?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Input data for creating a new Plan Manager.
 */
export interface PlanManagerCreateInput {
  name: string
  email?: string
  phone?: string
  billingEmail?: string
  notes?: string
}

/**
 * Input data for updating an existing Plan Manager.
 */
export interface PlanManagerUpdateInput {
  name?: string
  email?: string
  phone?: string
  billingEmail?: string
  notes?: string
}

/**
 * Funding management type options for residents.
 */
export type FundingManagementType = 'ndia' | 'plan_managed' | 'self_managed' | 'unknown'

/**
 * Display labels for funding management types.
 */
export const FUNDING_MANAGEMENT_TYPE_LABELS: Record<FundingManagementType, string> = {
  ndia: 'NDIA Managed',
  plan_managed: 'Plan Managed',
  self_managed: 'Self Managed',
  unknown: 'Unknown'
}

