import { NextRequest, NextResponse } from "next/server"
import { generateTransactionsForEligibleContracts } from "lib/services/transaction-generator"
import { createClient } from "lib/supabase/server"

/**
 * Automated Billing Cron Job
 * 
 * This endpoint is called by Vercel Cron on a schedule (e.g., daily at 2:00 AM)
 * It processes all eligible contracts and generates transactions automatically.
 * 
 * Security: In production, this should be protected by a CRON_SECRET environment variable
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
      .select('enabled, run_time')
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
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    // Parse the run time from settings (format: "HH:MM:SS")
    const [runHour, runMinute] = settings.run_time.split(':').map(Number)
    
    // Only run if current time matches the configured run time
    if (currentHour !== runHour || currentMinute !== runMinute) {
      console.log(`Not time to run yet. Configured: ${settings.run_time}, Current: ${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`)
      return NextResponse.json({
        success: true,
        message: `Not time to run yet. Configured time: ${settings.run_time}, Current time: ${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
        skipped: true,
        configuredTime: settings.run_time,
        currentTime: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
      })
    }
    
    // Generate transactions for all eligible contracts
    console.log(`[AUTOMATION CRON] Starting automated billing run at ${executionDate}`)
    const result = await generateTransactionsForEligibleContracts()
    
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
      summary: generateHumanReadableSummary(result, executionDate)
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
    
    // TODO: Send email notifications to admin emails
    // This would be implemented in Phase 4: Logging & Notifications
    
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
function generateHumanReadableSummary(result: any, executionDate: string): string {
  const date = new Date(executionDate).toLocaleString('en-AU', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Australia/Sydney'
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

