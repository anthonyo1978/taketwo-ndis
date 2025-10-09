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
    
    // Generate preview for next 3 days
    const today = new Date()
    const previewDays = 3
    const contractsByDay: Record<string, any[]> = {}
    
    for (let dayOffset = 0; dayOffset < previewDays; dayOffset++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() + dayOffset)
      const dateKey = checkDate.toISOString().split('T')[0] as string
      
      contractsByDay[dateKey] = []
      
      // Check each contract to see if it would run on this date
      for (const contract of contracts || []) {
        const nextRunDate = contract.next_run_date ? new Date(contract.next_run_date) : null
        
        if (!nextRunDate) continue
        
        // Determine if this contract should run on this day
        let shouldRunOnThisDay = false
        
        // For daily contracts, check each day
        if (contract.automated_drawdown_frequency === 'daily') {
          // Will run if checkDate >= nextRunDate
          shouldRunOnThisDay = checkDate >= nextRunDate
        } else {
          // For weekly/fortnightly, only runs on specific date
          const nextRunDateStr = nextRunDate.toISOString().split('T')[0]
          shouldRunOnThisDay = nextRunDateStr === dateKey
        }
        
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

