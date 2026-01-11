/**
 * Type definitions for property utility snapshots
 * Time-series log of utility meter readings and on-charge status
 */

/** Utility type options */
export type UtilityType = 'electricity' | 'water'

/** Reading unit options (optional) */
export type ReadingUnit = 'kWh' | 'kL' | 'Other'

/**
 * Complete utility snapshot record
 */
export interface UtilitySnapshot {
  id: string
  organizationId: string
  propertyId: string
  utilityType: UtilityType
  onCharge: boolean
  meterReading?: number
  readingUnit?: string
  readingAt?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Input data for creating a new utility snapshot
 */
export interface UtilitySnapshotCreateInput {
  propertyId: string
  utilityType: UtilityType
  onCharge: boolean
  meterReading?: number
  readingUnit?: string
  readingAt?: Date
  notes?: string
}

/**
 * Input data for updating a utility snapshot
 * (Minimal - prefer append-only)
 */
export interface UtilitySnapshotUpdateInput {
  notes?: string
}

