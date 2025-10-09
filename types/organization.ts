/**
 * Organization Settings Types
 * Used for PDF generation, branding, and organization-level configuration
 */

export interface OrganizationSettings {
  id: string
  organizationId: string
  
  // Organization Details
  organizationName: string
  abn?: string
  
  // Contact Information
  email?: string
  phone?: string
  website?: string
  
  // Address
  addressLine1?: string
  addressLine2?: string
  suburb?: string
  state?: string
  postcode?: string
  country: string
  
  // Branding
  logoUrl?: string
  primaryColor: string
  
  // Audit
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
}

export interface OrganizationSettingsUpdateInput {
  organizationName?: string
  abn?: string
  email?: string
  phone?: string
  website?: string
  addressLine1?: string
  addressLine2?: string
  suburb?: string
  state?: string
  postcode?: string
  country?: string
  logoUrl?: string
  primaryColor?: string
}

