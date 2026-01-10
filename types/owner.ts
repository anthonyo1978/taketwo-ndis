/**
 * Owner type definitions for property owners/landlords
 */

/** Valid owner types */
export type OwnerType = 'individual' | 'company' | 'trust' | 'other'

/**
 * Complete owner information
 */
export interface Owner {
  id: string
  organizationId: string
  name: string
  ownerType: OwnerType
  primaryContactName?: string
  email?: string
  phone?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  updatedBy?: string
}

/**
 * Input data for creating a new owner
 */
export interface OwnerCreateInput {
  name: string
  ownerType: OwnerType
  primaryContactName?: string
  email?: string
  phone?: string
  notes?: string
}

/**
 * Input data for updating an existing owner
 */
export interface OwnerUpdateInput {
  name?: string
  ownerType?: OwnerType
  primaryContactName?: string
  email?: string
  phone?: string
  notes?: string
}

