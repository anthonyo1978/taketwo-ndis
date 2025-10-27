import { createClient } from '../supabase/server'
import { format } from 'date-fns'

/**
 * Comprehensive diagnostics for automation system
 * Run this to understand why transactions aren't being created
 */
export async function runAutomationDiagnostics() {
  const results = {
    timestamp: new Date().toISOString(),
    timezone: 'Australia/Sydney',
    checks: [] as any[],
    contracts: [] as any[],
    recommendations: [] as string[]
  }
  
  const supabase = await createClient()
  
  // Check 1: Current time in multiple timezones
  const now = new Date()
  const auTime = now.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })
  const utcTime = now.toISOString()
  
  results.checks.push({
    name: 'Current Time',
    status: 'info',
    details: {
      UTC: utcTime,
      'Australia/Sydney': auTime,
      ISO: now.toISOString()
    }
  })
  
  // Check 2: Today's date string (what the cron uses)
  const todayStr = now.toLocaleDateString('en-CA', { 
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  
  results.checks.push({
    name: "Today's Date (for eligibility check)",
    status: 'info',
    details: { dateString: todayStr }
  })
  
  // Check 3: Count contracts with automation enabled
  const { data: allContracts, error: countError } = await supabase
    .from('funding_contracts')
    .select('id, next_run_date, current_balance, auto_billing_enabled, organization_id')
    .eq('auto_billing_enabled', true)
  
  if (countError) {
    results.checks.push({
      name: 'Contract Count',
      status: 'error',
      error: countError.message
    })
  } else {
    results.checks.push({
      name: 'Contracts with Automation Enabled',
      status: 'info',
      count: allContracts?.length || 0
    })
    
    // Check 4: How many are scheduled for TODAY
    const dueToday = allContracts?.filter(c => c.next_run_date === todayStr) || []
    results.checks.push({
      name: 'Contracts Due Today',
      status: dueToday.length > 0 ? 'success' : 'warning',
      count: dueToday.length,
      details: dueToday.length === 0 ? 'No contracts scheduled for today - this is likely why no transactions are being created!' : undefined
    })
    
    // Check 5: Show upcoming contracts
    const futureContracts = allContracts?.filter(c => c.next_run_date && c.next_run_date > todayStr)
      .sort((a, b) => (a.next_run_date || '').localeCompare(b.next_run_date || ''))
      .slice(0, 5) || []
    
    if (futureContracts.length > 0) {
      results.checks.push({
        name: 'Upcoming Contracts (next 5)',
        status: 'info',
        contracts: futureContracts.map(c => ({
          id: c.id,
          next_run_date: c.next_run_date,
          balance: c.current_balance,
          org: c.organization_id
        }))
      })
    }
    
    // Check 6: Show overdue contracts
    const overdue = allContracts?.filter(c => c.next_run_date && c.next_run_date < todayStr)
    
    if (overdue && overdue.length > 0) {
      results.checks.push({
        name: 'Overdue Contracts',
        status: 'error',
        count: overdue.length,
        details: 'These contracts have next_run_date in the past and will never run automatically!',
        sample: overdue.slice(0, 3).map(c => ({
          id: c.id,
          next_run_date: c.next_run_date,
          daysOverdue: Math.floor((new Date(todayStr).getTime() - new Date(c.next_run_date).getTime()) / (1000 * 60 * 60 * 24))
        }))
      })
      
      results.recommendations.push(`${overdue.length} contracts are overdue. Need to reset their next_run_date manually or update the logic.`)
    }
    
    // Check 7: Check organization isolation
    const orgCounts: Record<string, number> = {}
    allContracts?.forEach(c => {
      const orgId = c.organization_id || 'unknown'
      orgCounts[orgId] = (orgCounts[orgId] || 0) + 1
    })
    
    results.checks.push({
      name: 'Contracts by Organization',
      status: 'info',
      distribution: orgCounts
    })
  }
  
  // Check 8: Recent automation logs
  const { data: logs, error: logsError } = await supabase
    .from('automation_logs')
    .select('run_date, status, contracts_processed, errors')
    .order('run_date', { ascending: false })
    .limit(5)
  
  if (logsError) {
    results.checks.push({
      name: 'Recent Automation Logs',
      status: 'error',
      error: logsError.message
    })
  } else if (logs && logs.length > 0) {
    results.checks.push({
      name: 'Recent Automation Logs',
      status: 'info',
      logs: logs.map(log => ({
        run_date: log.run_date,
        status: log.status,
        processed: log.contracts_processed,
        hasErrors: !!log.errors
      }))
    })
  } else {
    results.checks.push({
      name: 'Recent Automation Logs',
      status: 'warning',
      details: 'No automation logs found - cron may not be running'
    })
    results.recommendations.push('Check if Vercel cron is properly configured and running.')
  }
  
  // Check 9: Check if today's date aligns with what we're querying
  const sampleDate = format(new Date(), 'yyyy-MM-dd')
  results.checks.push({
    name: 'Date Comparison',
    status: 'info',
    details: {
      'todayStr (what we query)': todayStr,
      'formatted today': sampleDate,
      match: todayStr === sampleDate
    }
  })
  
  // Generate recommendations
  if (results.checks.find(c => c.name === 'Contracts Due Today' && c.count === 0)) {
    results.recommendations.push('No contracts are scheduled to run today. Check the next_run_date fields of your contracts.')
  }
  
  if (results.checks.find(c => c.name === 'Overdue Contracts' && c.count > 0)) {
    results.recommendations.push('Some contracts are overdue. Consider running a catch-up script.')
  }
  
  return results
}

