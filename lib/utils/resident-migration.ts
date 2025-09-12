/**
 * Resident Migration Utility
 * 
 * This utility helps migrate existing resident data to include the new contract fields
 * for backward compatibility with the Drawing Down system.
 */

import type { FundingInformation, Resident } from 'types/resident'

/**
 * Migrate a single funding information object to include new contract fields
 */
export function migrateFundingInformation(funding: Record<string, unknown>): FundingInformation {
  return {
    ...funding,
    // Ensure required contract fields have safe defaults
    contractStatus: funding.contractStatus || 'Draft',
    originalAmount: funding.originalAmount || funding.amount || 0,
    currentBalance: funding.currentBalance || funding.amount || 0,
    drawdownRate: funding.drawdownRate || 'monthly',
    autoDrawdown: funding.autoDrawdown ?? true,
    lastDrawdownDate: funding.lastDrawdownDate || undefined,
    renewalDate: funding.renewalDate || undefined,
    parentContractId: funding.parentContractId || undefined,
    supportItemCode: funding.supportItemCode || undefined,
    dailySupportItemCost: funding.dailySupportItemCost || undefined,
    // Ensure dates are proper Date objects
    startDate: new Date(funding.startDate),
    endDate: funding.endDate ? new Date(funding.endDate) : undefined,
    createdAt: new Date(funding.createdAt),
    updatedAt: new Date(funding.updatedAt)
  }
}

/**
 * Migrate a single resident to include new contract fields
 */
export function migrateResident(resident: Record<string, unknown>): Resident {
  return {
    ...resident,
    // Migrate funding information
    fundingInformation: resident.fundingInformation?.map(migrateFundingInformation) || [],
    // Ensure dates are proper Date objects
    dateOfBirth: new Date(resident.dateOfBirth),
    createdAt: new Date(resident.createdAt),
    updatedAt: new Date(resident.updatedAt),
    // Ensure audit trail exists
    auditTrail: resident.auditTrail || []
  }
}

/**
 * Migrate all residents in storage to include new contract fields
 */
export function migrateAllResidents(): void {
  if (typeof window === 'undefined') {
    return // Skip on server side
  }

  try {
    const stored = localStorage.getItem('ndis_residents')
    if (!stored) return

    const residents = JSON.parse(stored) as Record<string, unknown>[]
    const migratedResidents = residents.map(migrateResident)
    
    localStorage.setItem('ndis_residents', JSON.stringify(migratedResidents))
    console.log(`Migrated ${migratedResidents.length} residents to Drawing Down format`)
  } catch (error) {
    console.error('Error migrating residents:', error)
  }
}

/**
 * Check if a resident needs migration
 */
export function needsResidentMigration(resident: Record<string, unknown>): boolean {
  if (!resident.fundingInformation || !Array.isArray(resident.fundingInformation)) {
    return true
  }
  
  return resident.fundingInformation.some((funding: Record<string, unknown>) => 
    !funding.hasOwnProperty('contractStatus') || 
    !funding.hasOwnProperty('originalAmount') ||
    !funding.hasOwnProperty('currentBalance')
  )
}

/**
 * Auto-migrate residents when the app loads
 */
export function autoMigrateResidents(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const stored = localStorage.getItem('ndis_residents')
    if (!stored) return

    const residents = JSON.parse(stored) as Record<string, unknown>[]
    const needsMigrationCount = residents.filter(needsResidentMigration).length
    
    if (needsMigrationCount > 0) {
      console.log(`Found ${needsMigrationCount} residents that need migration`)
      migrateAllResidents()
    }
  } catch (error) {
    console.error('Error checking resident migration status:', error)
  }
}

// Make migration functions available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).residentMigration = {
    migrateAllResidents,
    autoMigrateResidents,
    needsResidentMigration
  }
  console.log('Resident migration utilities available at window.residentMigration')
}
