import type { FundingInformation, ContractStatus, Resident, FundingModel, Gender, ResidentStatus } from '../../types/resident'

/**
 * Resident Migration Utility
 * 
 * This utility helps migrate existing resident data to include the new contract fields
 * for backward compatibility with the Drawing Down system.
 */

/**
 * Migrate a single funding information object to include new contract fields
 */
export function migrateFundingInformation(funding: Record<string, unknown>): FundingInformation {
  return {
    ...funding,
    // Ensure required contract fields have safe defaults
    id: (funding.id as string) || 'migrated-' + Date.now(),
    type: (funding.type as FundingModel) || 'Draw Down',
    amount: (funding.amount as number) || 0,
    isActive: (funding.isActive as boolean) ?? true,
    contractStatus: (funding.contractStatus as ContractStatus) || 'Draft',
    originalAmount: (funding.originalAmount as number) || (funding.amount as number) || 0,
    currentBalance: (funding.currentBalance as number) || (funding.amount as number) || 0,
    drawdownRate: (funding.drawdownRate as 'daily' | 'weekly' | 'monthly') || 'monthly',
    autoDrawdown: (funding.autoDrawdown as boolean) ?? true,
    autoBillingEnabled: (funding.autoBillingEnabled as boolean) ?? false,
    automatedDrawdownFrequency: (funding.automatedDrawdownFrequency as 'daily' | 'weekly' | 'fortnightly') || 'weekly',
    lastDrawdownDate: funding.lastDrawdownDate ? new Date(funding.lastDrawdownDate as string) : undefined,
    renewalDate: funding.renewalDate ? new Date(funding.renewalDate as string) : undefined,
    parentContractId: funding.parentContractId as string || undefined,
    supportItemCode: (funding.supportItemCode as string) || undefined,
    dailySupportItemCost: (funding.dailySupportItemCost as number) || undefined,
    // Ensure dates are proper Date objects
    startDate: new Date(funding.startDate as string),
    endDate: funding.endDate ? new Date(funding.endDate as string) : undefined,
    createdAt: new Date(funding.createdAt as string),
    updatedAt: new Date(funding.updatedAt as string)
  }
}

/**
 * Migrate a single resident to include new contract fields
 */
export function migrateResident(resident: Record<string, unknown>): Resident {
  return {
    ...resident,
    // Ensure required fields have safe defaults
    id: (resident.id as string) || 'migrated-resident-' + Date.now(),
    houseId: (resident.houseId as string) || 'unknown',
    firstName: (resident.firstName as string) || 'Unknown',
    lastName: (resident.lastName as string) || 'Resident',
    gender: (resident.gender as Gender) || 'Prefer not to say',
    status: (resident.status as ResidentStatus) || 'Active',
    preferences: (resident.preferences as any) || {},
    createdBy: (resident.createdBy as string) || 'system',
    updatedBy: (resident.updatedBy as string) || 'system',
    // Migrate funding information
    fundingInformation: (resident.fundingInformation as any[])?.map(migrateFundingInformation) || [],
    // Ensure dates are proper Date objects
    dateOfBirth: new Date(resident.dateOfBirth as string),
    createdAt: new Date(resident.createdAt as string),
    updatedAt: new Date(resident.updatedAt as string),
    // Ensure audit trail exists
    auditTrail: (resident.auditTrail as any[]) || []
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
  
  return resident.fundingInformation.some((funding: any) => 
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
