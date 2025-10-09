import { createClient } from '../supabase/server'

// Types for contract eligibility checking
export interface ContractEligibilityResult {
  contractId: string
  isEligible: boolean
  reasons: string[]
  contract: any
  resident: any
  house?: any
  eligibilityChecks: EligibilityCheck
}

export interface EligibilityCheck {
  statusCheck: boolean
  automationCheck: boolean
  balanceCheck: boolean
  dateCheck: boolean
  nextRunCheck: boolean
}

export interface ContractWithDetails {
  id: string
  resident_id: string
  type: string
  amount: number
  start_date: string
  end_date: string | null
  contract_status: string
  current_balance: number
  auto_billing_enabled: boolean
  automated_drawdown_frequency: string
  next_run_date: string | null
  first_run_date: string | null
  support_item_code: string | null
  daily_support_item_cost: number | null
  // Resident details
  resident: {
    id: string
    first_name: string
    last_name: string
    status: string
    house_id: string | null
  }
  // House details (if available)
  house?: {
    id: string
    descriptor: string
    address1: string
    suburb: string
    state: string
    postcode: string
  }
}

/**
 * Check if a single contract is eligible for automation
 */
export async function checkContractEligibility(contractId: string): Promise<ContractEligibilityResult> {
  const supabase = await createClient()
  
  // Get contract with all related data
  const { data: contract, error } = await supabase
    .from('funding_contracts')
    .select(`
      *,
      resident:residents!inner(
        id,
        first_name,
        last_name,
        status,
        house_id,
        house:houses(
          id,
          descriptor,
          address1,
          suburb,
          state,
          postcode
        )
      )
    `)
    .eq('id', contractId)
    .single()

  if (error || !contract) {
    return {
      contractId,
      isEligible: false,
      reasons: ['Contract not found'],
      contract: null,
      resident: null,
      eligibilityChecks: {
        statusCheck: false,
        automationCheck: false,
        balanceCheck: false,
        dateCheck: false,
        nextRunCheck: false
      }
    }
  }

  const eligibilityChecks = await performEligibilityChecks(contract)
  const reasons = getEligibilityReasons(eligibilityChecks, contract)
  const isEligible = Object.values(eligibilityChecks).every(check => check === true)

  return {
    contractId,
    isEligible,
    reasons,
    contract,
    resident: contract.resident,
    house: contract.resident?.house,
    eligibilityChecks
  }
}

/**
 * Get all contracts eligible for automation TODAY ONLY
 * Used by "Run Automation Now" button
 */
export async function getEligibleContracts(): Promise<ContractEligibilityResult[]> {
  const supabase = await createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD format

  // Get all contracts with automation enabled that have next_run_date = TODAY
  const { data: contracts, error } = await supabase
    .from('funding_contracts')
    .select(`
      *,
      resident:residents!inner(
        id,
        first_name,
        last_name,
        status,
        house_id,
        house:houses(
          id,
          descriptor,
          address1,
          suburb,
          state,
          postcode
        )
      )
    `)
    .eq('auto_billing_enabled', true)
    .eq('next_run_date', todayStr) // EXACTLY today only (no overdue contracts)

  if (error) {
    console.error('Error fetching contracts:', error)
    return []
  }

  // Check eligibility for each contract
  const results: ContractEligibilityResult[] = []
  for (const contract of contracts || []) {
    const eligibilityChecks = await performEligibilityChecks(contract)
    const reasons = getEligibilityReasons(eligibilityChecks, contract)
    const isEligible = Object.values(eligibilityChecks).every(check => check === true)
    
    results.push({
      contractId: contract.id,
      isEligible,
      reasons,
      contract,
      resident: contract.resident,
      house: contract.resident?.house,
      eligibilityChecks
    })
  }

  return results.filter(result => result.isEligible)
}

/**
 * Perform all eligibility checks on a contract
 */
async function performEligibilityChecks(contract: ContractWithDetails): Promise<EligibilityCheck> {
  const today = new Date()
  const contractStartDate = new Date(contract.start_date)
  const contractEndDate = contract.end_date ? new Date(contract.end_date) : null
  const nextRunDate = contract.next_run_date ? new Date(contract.next_run_date) : null

  return {
    // Rule 1: Status Validation
    statusCheck: validateContractStatus(contract),
    
    // Rule 2: Automation Settings
    automationCheck: validateAutomationSettings(contract),
    
    // Rule 3: Financial Validation
    balanceCheck: validateBalance(contract),
    
    // Rule 4: Date Validation
    dateCheck: validateDateRange(contract, today, contractStartDate, contractEndDate),
    
    // Rule 5: Next Run Date
    nextRunCheck: validateNextRunDate(today, nextRunDate)
  }
}

/**
 * Validate contract, resident, and house status
 */
function validateContractStatus(contract: ContractWithDetails): boolean {
  // Contract must be active
  if (contract.contract_status !== 'Active') {
    return false
  }

  // Resident must be active (case insensitive)
  if (!contract.resident?.status || contract.resident.status.toLowerCase() !== 'active') {
    return false
  }

  // House must exist (if resident has a house_id)
  // Note: This check is simplified since we don't have house data in the contract
  // In a real implementation, you'd check if the house_id exists in the houses table

  return true
}

/**
 * Validate automation settings
 */
function validateAutomationSettings(contract: ContractWithDetails): boolean {
  // Automation must be enabled
  if (!contract.auto_billing_enabled) {
    return false
  }

  // Frequency must be set
  if (!contract.automated_drawdown_frequency) {
    return false
  }

  // Frequency must be valid
  const validFrequencies = ['daily', 'weekly', 'fortnightly']
  if (!validFrequencies.includes(contract.automated_drawdown_frequency)) {
    return false
  }

  return true
}

/**
 * Validate sufficient balance
 */
function validateBalance(contract: ContractWithDetails): boolean {
  // Contract must have a positive balance
  if (contract.current_balance <= 0) {
    return false
  }

  // For now, we'll use a simple check: balance must be >= daily cost
  // This can be enhanced based on frequency and other factors
  if (contract.daily_support_item_cost && contract.current_balance < contract.daily_support_item_cost) {
    return false
  }

  return true
}

/**
 * Validate date ranges
 */
function validateDateRange(
  contract: ContractWithDetails, 
  today: Date, 
  startDate: Date, 
  endDate: Date | null
): boolean {
  // Current date must be >= start date
  if (today < startDate) {
    return false
  }

  // Current date must be <= end date (if end date exists)
  if (endDate && today > endDate) {
    return false
  }

  return true
}

/**
 * Validate next run date
 * IMPORTANT: For "Run Automation Now", we only process contracts scheduled for TODAY
 */
function validateNextRunDate(today: Date, nextRunDate: Date | null): boolean {
  // Next run date must be set
  if (!nextRunDate) {
    return false
  }

  // Normalize dates to compare (remove time component)
  const todayStr = today.toISOString().split('T')[0] as string
  const nextRunStr = nextRunDate.toISOString().split('T')[0] as string
  
  // Next run date must be EXACTLY today (not overdue, not future)
  return nextRunStr === todayStr
}

/**
 * Get human-readable reasons for eligibility status
 */
function getEligibilityReasons(checks: EligibilityCheck, contract: ContractWithDetails): string[] {
  const reasons: string[] = []

  if (!checks.statusCheck) {
    if (contract.contract_status !== 'Active') {
      reasons.push(`Contract status is '${contract.contract_status}', must be 'Active'`)
    }
    if (!contract.resident?.status || contract.resident.status.toLowerCase() !== 'active') {
      reasons.push(`Resident status is '${contract.resident?.status}', must be 'active'`)
    }
    // Note: House validation removed since we don't have house data in the contract
    // In a real implementation, you'd check if the house_id exists in the houses table
  }

  if (!checks.automationCheck) {
    if (!contract.auto_billing_enabled) {
      reasons.push('Automation is not enabled for this contract')
    }
    if (!contract.automated_drawdown_frequency) {
      reasons.push('Automation frequency is not set')
    }
    if (contract.automated_drawdown_frequency && !['daily', 'weekly', 'fortnightly'].includes(contract.automated_drawdown_frequency)) {
      reasons.push(`Invalid automation frequency: '${contract.automated_drawdown_frequency}'`)
    }
  }

  if (!checks.balanceCheck) {
    if (contract.current_balance <= 0) {
      reasons.push('Contract has insufficient balance')
    }
    if (contract.daily_support_item_cost && contract.current_balance < contract.daily_support_item_cost) {
      reasons.push(`Balance ($${contract.current_balance}) is less than daily cost ($${contract.daily_support_item_cost})`)
    }
  }

  if (!checks.dateCheck) {
    const today = new Date()
    const startDate = new Date(contract.start_date)
    const endDate = contract.end_date ? new Date(contract.end_date) : null

    if (today < startDate) {
      reasons.push(`Contract has not started yet (starts ${contract.start_date})`)
    }
    if (endDate && today > endDate) {
      reasons.push(`Contract has expired (ended ${contract.end_date})`)
    }
  }

  if (!checks.nextRunCheck) {
    if (!contract.next_run_date) {
      reasons.push('Next run date is not set')
    } else {
      const today = new Date()
      const nextRunDate = new Date(contract.next_run_date)
      const todayStr = today.toISOString().split('T')[0] as string
      const nextRunStr = nextRunDate.toISOString().split('T')[0] as string
      
      if (nextRunStr < todayStr) {
        reasons.push(`Next run date is in the past (${contract.next_run_date}) - overdue, not scheduled for today`)
      } else if (nextRunStr > todayStr) {
        reasons.push(`Next run date is scheduled for the future (${contract.next_run_date}) - not due today`)
      }
    }
  }

  return reasons
}
