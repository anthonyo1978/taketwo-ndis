/**
 * Billing Status Utilities
 * 
 * Determines if a resident can be billed based on:
 * - Resident status (Active, not Prospect)
 * - House assignment
 * - Active contract with available funds
 */

export type BillingStatus = 'ready' | 'not-ready'

export interface BillingStatusDetails {
  status: BillingStatus
  color: 'green' | 'orange'
  reasons: string[]
}

/**
 * Determine if a resident is billing-ready
 * 
 * Criteria for GREEN (ready):
 * - Resident status is 'Active' (not 'Prospect', 'Inactive', 'Draft')
 * - Resident is assigned to a house
 * - Has at least one active contract
 * - At least one contract has available funds (current_balance > 0)
 * 
 * Otherwise ORANGE (not-ready)
 */
export function getResidentBillingStatus(resident: any): BillingStatusDetails {
  const reasons: string[] = []
  
  // Debug logging (remove in production if needed)
  if (typeof window !== 'undefined' && window.location.search.includes('debug-billing')) {
    console.log('[BILLING STATUS] Checking resident:', {
      id: resident.id,
      name: `${resident.firstName} ${resident.lastName}`,
      status: resident.status,
      houseId: resident.houseId || resident.house_id,
      contracts: resident.fundingContracts || resident.funding_contracts || []
    })
  }
  
  // Check 1: Resident status must be 'Active'
  const isActive = resident.status?.toLowerCase() === 'active'
  if (!isActive) {
    const status = resident.status || 'Unknown'
    reasons.push(`Status: ${status}`)
  }
  
  // Check 2: Must be assigned to a house
  const hasHouse = !!resident.houseId || !!resident.house_id
  if (!hasHouse) {
    reasons.push('No house assigned')
  }
  
  // Check 3: Must have at least one active contract
  const contracts = resident.fundingContracts || resident.funding_contracts || []
  const activeContracts = contracts.filter((c: any) => 
    c.contractStatus === 'Active' || c.contract_status === 'Active'
  )
  
  if (contracts.length === 0) {
    reasons.push('No contracts')
  } else if (activeContracts.length === 0) {
    reasons.push('No active contracts')
  }
  
  // Check 4: Must have available funds (balance > 0) in at least one active contract
  const contractsWithFunds = activeContracts.filter((c: any) => {
    const balance = c.currentBalance ?? c.current_balance ?? 0
    return balance > 0
  })
  
  if (activeContracts.length > 0 && contractsWithFunds.length === 0) {
    reasons.push('No available funds')
  }
  
  // Determine status
  const isReady = isActive && hasHouse && activeContracts.length > 0 && contractsWithFunds.length > 0
  
  // Debug logging
  if (typeof window !== 'undefined' && window.location.search.includes('debug-billing')) {
    console.log('[BILLING STATUS] Result:', {
      isReady,
      isActive,
      hasHouse,
      activeContractsCount: activeContracts.length,
      contractsWithFundsCount: contractsWithFunds.length,
      reasons
    })
  }
  
  return {
    status: isReady ? 'ready' : 'not-ready',
    color: isReady ? 'green' : 'orange',
    reasons
  }
}

/**
 * Get Tailwind CSS classes for billing status ring
 */
export function getBillingStatusRingClass(status: BillingStatus): string {
  return status === 'ready' 
    ? 'ring-2 ring-green-500 ring-offset-2'
    : 'ring-2 ring-orange-500 ring-offset-2'
}

/**
 * Get border color class for billing status
 */
export function getBillingStatusBorderClass(status: BillingStatus): string {
  return status === 'ready'
    ? 'border-green-500'
    : 'border-orange-500'
}

