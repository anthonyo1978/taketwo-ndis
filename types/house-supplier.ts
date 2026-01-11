/**
 * HouseSupplier type definitions for linking suppliers to houses
 */

import type { Supplier } from './supplier'

/**
 * House-Supplier link (junction table record)
 */
export interface HouseSupplier {
  id: string
  organizationId: string
  houseId: string
  supplierId: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * House-Supplier link with populated supplier data
 */
export interface HouseSupplierWithDetails extends HouseSupplier {
  supplier: Supplier
}

/**
 * Input data for creating a new house-supplier link
 */
export interface HouseSupplierCreateInput {
  houseId: string
  supplierId: string
  notes?: string
}

/**
 * Input data for updating an existing house-supplier link
 */
export interface HouseSupplierUpdateInput {
  notes?: string
}

