/**
 * Supplier type definitions for maintenance and service providers
 */

/** Valid supplier types */
export type SupplierType = 
  | 'General Maintenance' 
  | 'Plumber' 
  | 'Electrician' 
  | 'Cleaning' 
  | 'Landscaping' 
  | 'HVAC' 
  | 'Security' 
  | 'Other'

/**
 * Complete supplier information
 */
export interface Supplier {
  id: string
  organizationId: string
  name: string
  supplierType?: SupplierType
  contactName?: string
  phone?: string
  email?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Input data for creating a new supplier
 */
export interface SupplierCreateInput {
  name: string
  supplierType?: SupplierType
  contactName?: string
  phone?: string
  email?: string
  notes?: string
}

/**
 * Input data for updating an existing supplier
 */
export interface SupplierUpdateInput {
  name?: string
  supplierType?: SupplierType
  contactName?: string
  phone?: string
  email?: string
  notes?: string
}

