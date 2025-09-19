import { differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns'
import type { FundingInformation } from '@/types/resident'

/**
 * Calculate the number of elapsed periods based on the drawdown rate
 */
function getElapsedPeriods(startDate: Date, endDate: Date, drawdownRate: 'daily' | 'weekly' | 'monthly'): number {
  switch (drawdownRate) {
    case 'daily':
      return differenceInDays(endDate, startDate)
    case 'weekly':
      return differenceInWeeks(endDate, startDate)
    case 'monthly':
      return differenceInMonths(endDate, startDate)
    default:
      return 0
  }
}

/**
 * Calculate the current balance for a funding contract based on elapsed time
 * @param contract - The funding contract
 * @returns The current calculated balance
 */
export function calculateCurrentBalance(contract: FundingInformation): number {
  // If contract is not active or auto-drawdown is disabled, return original amount
  if (contract.contractStatus !== 'Active' || !contract.autoDrawdown) {
    return contract.originalAmount
  }

  // If no end date, return original amount (no drawdown)
  if (!contract.endDate) {
    return contract.originalAmount
  }

  const now = new Date()
  
  // Calculate elapsed time and total contract period
  const elapsedPeriods = getElapsedPeriods(contract.startDate, now, contract.drawdownRate)
  const totalPeriods = getElapsedPeriods(contract.startDate, contract.endDate, contract.drawdownRate)
  
  // Handle same-day contracts - they should be fully drawn down
  if (totalPeriods === 0) {
    return 0
  }
  
  // Calculate drawdown percentage (linear drawdown over time)
  const drawdownPercentage = Math.min(1, Math.max(0, elapsedPeriods / totalPeriods))
  const drawnDownAmount = contract.originalAmount * drawdownPercentage
  
  // Return remaining balance (original - drawn down)
  return Math.max(0, contract.originalAmount - drawnDownAmount)
}

/**
 * Calculate the total amount that has been drawn down from a contract
 * @param contract - The funding contract
 * @returns The amount that has been drawn down
 */
export function calculateDrawdownAmount(contract: FundingInformation): number {
  const currentBalance = calculateCurrentBalance(contract)
  return contract.originalAmount - currentBalance
}

/**
 * Check if a contract is expiring soon (within the specified days)
 * @param contract - The funding contract
 * @param daysThreshold - Number of days to consider "soon" (default: 30)
 * @returns True if contract expires within the threshold
 */
export function isContractExpiringSoon(contract: FundingInformation, daysThreshold: number = 30): boolean {
  if (!contract.endDate) {
    return false
  }
  
  const now = new Date()
  const daysUntilExpiry = differenceInDays(contract.endDate, now)
  return daysUntilExpiry <= daysThreshold && daysUntilExpiry >= 0
}

/**
 * Generate a renewal contract based on an expiring contract
 * @param expiringContract - The contract that needs renewal
 * @returns A new contract object for renewal
 */
export function generateContractRenewal(expiringContract: FundingInformation): Partial<FundingInformation> {
  const now = new Date()
  const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
  
  return {
    type: expiringContract.type,
    originalAmount: expiringContract.originalAmount,
    currentBalance: expiringContract.originalAmount, // Reset to full amount
    amount: expiringContract.originalAmount,
    startDate: now,
    endDate: nextYear,
    drawdownRate: expiringContract.drawdownRate,
    autoDrawdown: expiringContract.autoDrawdown,
    contractStatus: 'Draft',
    parentContractId: expiringContract.id,
    description: `Renewal of contract ${expiringContract.id}`,
    isActive: false // Will be activated separately
  }
}

/**
 * Calculate contract balance summary across multiple contracts
 * @param contracts - Array of funding contracts
 * @returns Summary of all contract balances
 */
export function calculateBalanceSummary(contracts: FundingInformation[]) {
  const summary = {
    totalOriginal: 0,
    totalCurrent: 0,
    totalDrawnDown: 0,
    activeContracts: 0,
    expiringSoon: 0
  }

  contracts.forEach(contract => {
    const currentBalance = calculateCurrentBalance(contract)
    const drawnDown = contract.originalAmount - currentBalance
    
    summary.totalOriginal += contract.originalAmount
    summary.totalCurrent += currentBalance
    summary.totalDrawnDown += drawnDown
    
    if (contract.contractStatus === 'Active') {
      summary.activeContracts++
    }
    
    if (isContractExpiringSoon(contract)) {
      summary.expiringSoon++
    }
  })

  return summary
}

/**
 * Get the drawdown rate display text
 * @param rate - The drawdown rate
 * @returns Human-readable text for the rate
 */
export function getDrawdownRateText(rate: 'daily' | 'weekly' | 'monthly'): string {
  switch (rate) {
    case 'daily':
      return 'Daily'
    case 'weekly':
      return 'Weekly'
    case 'monthly':
      return 'Monthly'
    default:
      return 'Unknown'
  }
}

/**
 * Calculate the percentage of contract that has been drawn down
 * @param contract - The funding contract
 * @returns Percentage (0-100) of contract drawn down
 */
export function getDrawdownPercentage(contract: FundingInformation): number {
  const drawnDown = calculateDrawdownAmount(contract)
  if (contract.originalAmount === 0) return 0
  return Math.min(100, (drawnDown / contract.originalAmount) * 100)
}

/**
 * Check if a contract needs renewal (expired or expiring soon)
 * @param contract - The funding contract
 * @returns True if contract needs renewal
 */
export function needsRenewal(contract: FundingInformation): boolean {
  if (!contract.endDate) {
    return false
  }
  
  const now = new Date()
  const daysUntilExpiry = differenceInDays(contract.endDate, now)
  
  // Needs renewal if expired or expiring within 30 days
  return daysUntilExpiry <= 30
}