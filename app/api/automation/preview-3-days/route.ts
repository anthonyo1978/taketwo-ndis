import { NextResponse } from "next/server"
import { createClient } from "lib/supabase/server"
import { getTransactionAmount } from "lib/services/contract-rate-calculator"

/**
 * GET /api/automation/preview-3-days
 * Preview which contracts will run in the next 3 days
 * Daily contracts will appear multiple times (once per day)
 */
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get all contracts with automation enabled
    const { data: contracts, error } = await supabase
      .from('funding_contracts')
      .select(`
        *,
        resident:residents!inner (
          id,
          first_name,
          last_name,
          status,
          house_id,
          house:houses!inner (
            id,
            descriptor,
            address1,
            suburb,
            status
          )
        )
      `)
      .eq('auto_billing_enabled', true)
      .eq('contract_status', 'Active')
      .eq('resident.status', 'Active')
      .eq('resident.house.status', 'Active')
    
    if (error) {
      console.error('Error fetching contracts:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch contracts'
      }, { status: 500 })
    }
    
    // Generate preview for next 3 days (using Australia/Sydney timezone)
    const now = new Date()
    // Get today's date in Australia/Sydney timezone
    const todayStr = now.toLocaleDateString('en-CA', { 
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    const today = new Date(`${todayStr}T00:00:00`)
    today.setHours(0, 0, 0, 0) // Reset to start of day
    const previewDays = 3
    const contractsByDay: Record<string, any[]> = {}
    
    // Track simulated next_run_dates as we go through days (for daily contracts)
    const simulatedNextRunDates: Record<string, Date> = {}
    
    for (let dayOffset = 0; dayOffset < previewDays; dayOffset++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() + dayOffset)
      const dateKey = checkDate.toISOString().split('T')[0] as string
      
      contractsByDay[dateKey] = []
      
      // Check each contract to see if it would run on this date
      for (const contract of contracts || []) {
        const originalNextRunDate = contract.next_run_date ? new Date(contract.next_run_date) : null
        
        if (!originalNextRunDate) continue
        
        // Get the simulated next_run_date (accounts for previous days in the preview)
        const contractKey = contract.id
        const simulatedNextRun = simulatedNextRunDates[contractKey] || new Date(originalNextRunDate)
        simulatedNextRun.setHours(0, 0, 0, 0)
        
        // Normalize dates for comparison
        const simulatedNextRunStr = simulatedNextRun.toISOString().split('T')[0]
        const checkDateStr = checkDate.toISOString().split('T')[0]
        
        // Check if this contract should run on this day
        const shouldRunOnThisDay = simulatedNextRunStr === checkDateStr
        
        if (shouldRunOnThisDay) {
          // Calculate transaction amount
          const transactionAmount = getTransactionAmount(
            contract.automated_drawdown_frequency as 'daily' | 'weekly' | 'fortnightly',
            contract.daily_support_item_cost || 0
          )
          
          // Check if sufficient balance
          const hasSufficientBalance = contract.current_balance >= transactionAmount
          
          // Calculate next run date after this transaction
          let nextRunAfter = new Date(checkDate)
          switch (contract.automated_drawdown_frequency) {
            case 'daily':
              nextRunAfter.setDate(nextRunAfter.getDate() + 1)
              break
            case 'weekly':
              nextRunAfter.setDate(nextRunAfter.getDate() + 7)
              break
            case 'fortnightly':
              nextRunAfter.setDate(nextRunAfter.getDate() + 14)
              break
          }
          
          contractsByDay[dateKey].push({
            contractId: contract.id,
            residentId: contract.resident.id,
            residentName: `${contract.resident.first_name} ${contract.resident.last_name}`,
            houseName: contract.resident.house.descriptor || `${contract.resident.house.address1}, ${contract.resident.house.suburb}`,
            contractType: contract.type,
            frequency: contract.automated_drawdown_frequency,
            transactionAmount,
            currentBalance: contract.current_balance,
            balanceAfterTransaction: contract.current_balance - transactionAmount,
            nextRunDateAfter: nextRunAfter.toISOString().split('T')[0],
            hasSufficientBalance,
            scheduledRunDate: dateKey
          })
          
          // Update simulated next_run_date for future iterations
          simulatedNextRunDates[contractKey] = nextRunAfter
        }
      }
    }
    
    // Calculate summary statistics
    const totalContracts = Object.values(contractsByDay).flat().length
    const uniqueContracts = new Set(Object.values(contractsByDay).flat().map(c => c.contractId)).size
    const totalAmount = Object.values(contractsByDay).flat().reduce((sum, c) => sum + c.transactionAmount, 0)
    
    return NextResponse.json({
      success: true,
      data: {
        contractsByDay,
        summary: {
          totalScheduledRuns: totalContracts,
          uniqueContracts,
          totalAmount,
          days: Object.keys(contractsByDay).length
        }
      }
    })
    
  } catch (error) {
    console.error('Error in preview-3-days:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

