import { NextRequest, NextResponse } from "next/server"
import { generateTransactionsForEligibleContracts } from "lib/services/transaction-generator"
import { createClient } from "lib/supabase/server"
import { sendAutomationCompletionEmail, sendAutomationErrorEmail } from "lib/services/email-notifications"

/**
 * Automated Billing Cron Job
 * 
 * This endpoint is called by Vercel Cron on a schedule (e.g., daily at 2:00 AM)
 * It processes all eligible contracts and generates transactions automatically.
 * 
 * Security: In production, this should be protected by a CRON_SECRET environment variable
 * 
 * TEST COMMENT: Testing local → GitHub → Vercel deployment pathway - $(date)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const executionDate = new Date().toISOString()
  
  try {
    // Verify cron secret (optional but recommended for production)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }
    
    // Check if automation is enabled and if it's time to run
    const supabase = await createClient()
    const { data: settings } = await supabase
      .from('automation_settings')
      .select('enabled, run_time, timezone, admin_emails')
      .eq('organization_id', '00000000-0000-0000-0000-000000000000')
      .single()
    
    if (!settings || !settings.enabled) {
      console.log('Automation is disabled. Skipping cron job.')
      return NextResponse.json({
        success: true,
        message: 'Automation is disabled',
        skipped: true
      })
    }

    // Check if it's time to run based on settings
    // Convert current UTC time to configured timezone for accurate comparison
    const configuredTimezone = settings.timezone || 'Australia/Sydney'
    const now = new Date()
    
    // Get current time in the configured timezone
    const currentTimeInTimezone = new Intl.DateTimeFormat('en-AU', {
      timeZone: configuredTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now)
    
    const [currentHour, currentMinute] = currentTimeInTimezone.split(':').map(Number)
    
    // Parse the run time from settings (format: "HH:MM:SS" or "HH:MM")
    const [runHour, runMinute] = settings.run_time.split(':').map(Number)
    
    console.log(`[AUTOMATION CRON] Timezone: ${configuredTimezone}`)
    console.log(`[AUTOMATION CRON] Current time in ${configuredTimezone}: ${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`)
    console.log(`[AUTOMATION CRON] Configured run time: ${runHour.toString().padStart(2, '0')}:${runMinute.toString().padStart(2, '0')}`)
    
    // Only run if the current time matches the configured time (within the same hour and minute)
    if (currentHour !== runHour || currentMinute !== runMinute) {
      console.log(`[AUTOMATION CRON] Not time to run yet. Skipping...`)
      return NextResponse.json({
        success: true,
        message: `Not time to run yet. Configured time: ${runHour.toString().padStart(2, '0')}:${runMinute.toString().padStart(2, '0')} ${configuredTimezone}, Current time: ${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')} ${configuredTimezone}`,
        skipped: true,
        configuredTime: `${runHour.toString().padStart(2, '0')}:${runMinute.toString().padStart(2, '0')} ${configuredTimezone}`,
        currentTime: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')} ${configuredTimezone}`
      })
    }
    
    console.log(`[AUTOMATION CRON] ✅ Time matches! Proceeding with automation run...`)
    
    // Generate transactions for all eligible contracts
    console.log(`[AUTOMATION CRON] Starting automated billing run at ${executionDate}`)
    console.log(`[AUTOMATION CRON] Using timezone: ${settings.timezone || 'Australia/Sydney'}`)
    const result = await generateTransactionsForEligibleContracts(settings.timezone)
    
    const executionTime = Date.now() - startTime
    
    // Create automation log entry
    const logEntry = {
      run_date: executionDate,
      status: result.success && result.failedTransactions === 0 ? 'success' 
        : result.failedTransactions > 0 && result.successfulTransactions > 0 ? 'partial'
        : 'failed',
      contracts_processed: result.successfulTransactions,
      contracts_skipped: 0, // Could be enhanced to track skipped contracts
      contracts_failed: result.failedTransactions,
      execution_time_ms: executionTime,
      errors: result.errors,
      summary: generateHumanReadableSummary(result, executionDate, settings.timezone)
    }
    
    // Save log to database
    await supabase
      .from('automation_logs')
      .insert(logEntry)
    
    // Log results
    console.log(`[AUTOMATION CRON] Completed in ${executionTime}ms`)
    console.log(`[AUTOMATION CRON] Processed: ${result.processedContracts} contracts`)
    console.log(`[AUTOMATION CRON] Successful: ${result.successfulTransactions} transactions`)
    console.log(`[AUTOMATION CRON] Failed: ${result.failedTransactions} transactions`)
    console.log(`[AUTOMATION CRON] Total Amount: $${result.summary.totalAmount.toFixed(2)}`)
    
    if (result.errors.length > 0) {
      console.error(`[AUTOMATION CRON] Errors:`, result.errors)
    }
    
    // Send email notifications to admin emails
    if (settings.admin_emails && settings.admin_emails.length > 0) {
      console.log('[AUTOMATION CRON] Preparing email with', result.transactions.length, 'transactions')
      console.log('[AUTOMATION CRON] Transaction IDs:', result.transactions.map(t => t.id))
      
      // Fetch resident names and updated contract balances for email
      const transactionDetails = await Promise.all(
        result.transactions.map(async (txn) => {
          const { data: resident } = await supabase
            .from('residents')
            .select('first_name, last_name')
            .eq('id', txn.residentId)
            .single()
          
          const { data: contract } = await supabase
            .from('funding_contracts')
            .select('current_balance, next_run_date')
            .eq('id', txn.contractId)
            .single()
          
          const detail = {
            residentName: resident ? `${resident.first_name} ${resident.last_name}` : 'Unknown',
            amount: txn.amount,
            remainingBalance: contract?.current_balance || 0,
            nextRunDate: contract?.next_run_date || new Date().toISOString()
          }
          console.log('[AUTOMATION CRON] Transaction detail for email:', detail)
          return detail
        })
      )
      
      console.log('[AUTOMATION CRON] Final transactionDetails for email:', transactionDetails)
      
      // Add resident names to errors
      const errorsWithNames = await Promise.all(
        result.errors.map(async (error) => {
          const { data: resident } = await supabase
            .from('residents')
            .select('first_name, last_name')
            .eq('id', error.residentId)
            .single()
          
          return {
            ...error,
            residentName: resident ? `${resident.first_name} ${resident.last_name}` : 'Unknown'
          }
        })
      )
      
      const emailResult = await sendAutomationCompletionEmail(
        settings.admin_emails,
        {
          executionDate,
          executionTime,
          processedContracts: result.processedContracts,
          successfulTransactions: result.successfulTransactions,
          failedTransactions: result.failedTransactions,
          totalAmount: result.summary.totalAmount,
          transactions: transactionDetails,
          errors: errorsWithNames,
          summary: result.summary,
          timezone: settings.timezone || 'Australia/Sydney'
        }
      )
      
      if (!emailResult.success) {
        console.error('[AUTOMATION CRON] Failed to send email notification:', emailResult.error)
      } else {
        console.log('[AUTOMATION CRON] Email notification sent to:', settings.admin_emails.join(', '))
      }
    }
    
    return NextResponse.json({
      success: result.success,
      data: {
        executionDate,
        executionTime,
        processedContracts: result.processedContracts,
        successfulTransactions: result.successfulTransactions,
        failedTransactions: result.failedTransactions,
        totalAmount: result.summary.totalAmount,
        summary: result.summary
      }
    })
    
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[AUTOMATION CRON] Fatal error:', error)
    
    // Try to send error email notification
    try {
      const supabase = await createClient()
      const { data: settings } = await supabase
        .from('automation_settings')
        .select('admin_emails')
        .eq('organization_id', '00000000-0000-0000-0000-000000000000')
        .single()
      
      if (settings?.admin_emails && settings.admin_emails.length > 0) {
        await sendAutomationErrorEmail(
          settings.admin_emails,
          error instanceof Error ? error.message : 'Unknown error',
          error
        )
      }
    } catch (emailError) {
      console.error('[AUTOMATION CRON] Failed to send error email:', emailError)
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionDate,
      executionTime
    }, { status: 500 })
  }
}

/**
 * Generate a human-readable summary of the automation run
 */
function generateHumanReadableSummary(result: any, executionDate: string, timezone: string = 'Australia/Sydney'): string {
  const date = new Date(executionDate).toLocaleString('en-AU', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: timezone
  })
  
  let summary = `Automated Billing Run - ${date}\n\n`
  summary += `📊 SUMMARY\n`
  summary += `• Contracts Processed: ${result.processedContracts}\n`
  summary += `• Successful Transactions: ${result.successfulTransactions}\n`
  summary += `• Failed Transactions: ${result.failedTransactions}\n`
  summary += `• Total Amount: $${result.summary.totalAmount.toFixed(2)}\n\n`
  
  if (result.summary.frequencyBreakdown && Object.keys(result.summary.frequencyBreakdown).length > 0) {
    summary += `📈 FREQUENCY BREAKDOWN\n`
    Object.entries(result.summary.frequencyBreakdown).forEach(([freq, count]) => {
      summary += `• ${freq}: ${count} transaction${count !== 1 ? 's' : ''}\n`
    })
    summary += `\n`
  }
  
  if (result.errors && result.errors.length > 0) {
    summary += `⚠️ ERRORS (${result.errors.length})\n`
    result.errors.slice(0, 10).forEach((error: any, index: number) => {
      summary += `${index + 1}. Contract ${error.contractId}: ${error.error}\n`
    })
    if (result.errors.length > 10) {
      summary += `... and ${result.errors.length - 10} more errors\n`
    }
  } else {
    summary += `✅ No errors encountered\n`
  }
  
  return summary
}

// Force deployment trigger

