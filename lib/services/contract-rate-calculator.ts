import { differenceInDays, parseISO, isValid } from 'date-fns'
import { createClient } from '../supabase/server'

/**
 * Calculate the daily support item cost for a contract based on:
 * - Total contract amount
 * - Contract duration (start_date to end_date)
 * - Automation frequency
 */
export interface ContractRateCalculation {
  dailyRate: number
  weeklyRate: number
  fortnightlyRate: number
  totalDays: number
  calculationMethod: 'automatic' | 'manual'
  isValid: boolean
  errors: string[]
}

/**
 * Calculate contract rates automatically based on amount and duration
 */
export function calculateContractRates(
  amount: number,
  startDate: string,
  endDate: string | null,
  frequency: 'daily' | 'weekly' | 'fortnightly'
): ContractRateCalculation {
  const errors: string[] = []
  
  // Validate inputs
  if (amount <= 0) {
    errors.push('Contract amount must be greater than 0')
  }
  
  if (!startDate) {
    errors.push('Contract start date is required')
  }
  
  if (!endDate) {
    errors.push('Contract end date is required for automatic calculation')
  }
  
  if (errors.length > 0) {
    return {
      dailyRate: 0,
      weeklyRate: 0,
      fortnightlyRate: 0,
      totalDays: 0,
      calculationMethod: 'automatic',
      isValid: false,
      errors
    }
  }
  
  try {
    const start = new Date(startDate)
    const end = new Date(endDate!)
    
    // Validate dates
    if (start >= end) {
      errors.push('End date must be after start date')
    }
    
    if (errors.length > 0) {
      return {
        dailyRate: 0,
        weeklyRate: 0,
        fortnightlyRate: 0,
        totalDays: 0,
        calculationMethod: 'automatic',
        isValid: false,
        errors
      }
    }
    
    // Calculate total days in contract (including both start and end dates)
    const totalDays = differenceInDays(end, start) + 1
    
    if (totalDays <= 0) {
      errors.push('Contract duration must be at least 1 day')
    }
    
    if (errors.length > 0) {
      return {
        dailyRate: 0,
        weeklyRate: 0,
        fortnightlyRate: 0,
        totalDays: 0,
        calculationMethod: 'automatic',
        isValid: false,
        errors
      }
    }
    
    // Calculate daily rate
    const dailyRate = amount / totalDays
    
    // Calculate rates for different frequencies
    const weeklyRate = dailyRate * 7
    const fortnightlyRate = dailyRate * 14
    
    return {
      dailyRate: Math.round(dailyRate * 100) / 100, // Round to 2 decimal places
      weeklyRate: Math.round(weeklyRate * 100) / 100,
      fortnightlyRate: Math.round(fortnightlyRate * 100) / 100,
      totalDays,
      calculationMethod: 'automatic',
      isValid: true,
      errors: []
    }
    
  } catch (error) {
    return {
      dailyRate: 0,
      weeklyRate: 0,
      fortnightlyRate: 0,
      totalDays: 0,
      calculationMethod: 'automatic',
      isValid: false,
      errors: [`Date calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    }
  }
}

/**
 * Get the appropriate transaction amount based on frequency
 */
export function getTransactionAmount(
  frequency: 'daily' | 'weekly' | 'fortnightly',
  dailyRate: number
): number {
  switch (frequency) {
    case 'daily':
      return dailyRate
    case 'weekly':
      return dailyRate * 7
    case 'fortnightly':
      return dailyRate * 14
    default:
      return dailyRate
  }
}

/**
 * Update a contract's daily support item cost when automation is enabled
 */
export async function updateContractDailyRate(
  contractId: string,
  calculation: ContractRateCalculation
): Promise<{ success: boolean; error?: string }> {
  if (!calculation.isValid) {
    return {
      success: false,
      error: `Invalid calculation: ${calculation.errors.join(', ')}`
    }
  }
  
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('funding_contracts')
      .update({
        daily_support_item_cost: calculation.dailyRate,
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId)
    
    if (error) {
      return {
        success: false,
        error: `Database update failed: ${error.message}`
      }
    }
    
    return { success: true }
    
  } catch (error) {
    return {
      success: false,
      error: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Calculate and update contract rates when automation is enabled
 */
export async function enableContractAutomation(
  contractId: string,
  frequency: 'daily' | 'weekly' | 'fortnightly'
): Promise<{ success: boolean; calculation?: ContractRateCalculation; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Get contract details
    const { data: contract, error: fetchError } = await supabase
      .from('funding_contracts')
      .select('amount, start_date, end_date, daily_support_item_cost')
      .eq('id', contractId)
      .single()
    
    if (fetchError || !contract) {
      return {
        success: false,
        error: `Contract not found: ${fetchError?.message || 'Unknown error'}`
      }
    }
    
    // Calculate rates
    const calculation = calculateContractRates(
      contract.amount,
      contract.start_date,
      contract.end_date,
      frequency
    )
    
    if (!calculation.isValid) {
      return {
        success: false,
        calculation,
        error: `Calculation failed: ${calculation.errors.join(', ')}`
      }
    }
    
    // Update contract with new daily rate and automation settings
    const { error: updateError } = await supabase
      .from('funding_contracts')
      .update({
        auto_billing_enabled: true,
        automated_drawdown_frequency: frequency,
        daily_support_item_cost: calculation.dailyRate,
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId)
    
    if (updateError) {
      return {
        success: false,
        calculation,
        error: `Failed to enable automation: ${updateError.message}`
      }
    }
    
    return {
      success: true,
      calculation
    }
    
  } catch (error) {
    return {
      success: false,
      error: `Enable automation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}
