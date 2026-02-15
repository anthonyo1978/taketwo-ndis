/**
 * Head Lease type definitions for property lease agreements
 */

import type { Owner } from './owner'

/** Valid lease statuses */
export type LeaseStatus = 'active' | 'upcoming' | 'expired'

/** Valid rent frequency options */
export type RentFrequency = 'weekly' | 'fortnightly' | 'monthly'

/**
 * Complete head lease information
 */
export interface HeadLease {
  id: string
  organizationId: string
  houseId: string
  ownerId: string
  reference?: string
  startDate: Date
  endDate?: Date
  status: LeaseStatus
  rentAmount?: number
  rentFrequency: RentFrequency
  reviewDate?: Date
  notes?: string
  documentUrl?: string
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  updatedBy?: string
  // Optional populated owner data
  owner?: Owner
}

/**
 * Input data for creating a new head lease
 */
export interface HeadLeaseCreateInput {
  houseId: string
  ownerId: string
  reference?: string
  startDate: Date
  endDate?: Date
  status: LeaseStatus
  rentAmount?: number
  rentFrequency: RentFrequency
  reviewDate?: Date
  notes?: string
  documentUrl?: string
}

/**
 * Input data for updating an existing head lease
 */
export interface HeadLeaseUpdateInput {
  ownerId?: string
  reference?: string
  startDate?: Date
  endDate?: Date
  status?: LeaseStatus
  rentAmount?: number
  rentFrequency?: RentFrequency
  reviewDate?: Date
  notes?: string
  documentUrl?: string
}

