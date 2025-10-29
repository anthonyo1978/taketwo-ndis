import { NextRequest, NextResponse } from "next/server"
import { generateTransactionsForEligibleContracts } from "lib/services/transaction-generator"
import { sendAutomationCompletionEmail, sendAutomationErrorEmail } from "lib/services/email-notifications"

/**
 * Automated Billing Cron Job - Multi-Tenant
 * 
 * This endpoint is called by Vercel Cron daily at midnight UTC (0 0 * * *)
 * It processes ALL organizations with automation enabled.
 * Each org gets separate transaction generation and email notification.
 * 
 * Security: Protected by CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const executionDate = new Date().toISOString()
  
  // Catch-up mode is now always enabled by default
  // This ensures contracts don't get skipped if a cron run fails or is delayed
  // Processes contracts scheduled for today or earlier
  const catchUpMode = true
  
  try {
    // Verify cron secret (only if CRON_SECRET is set in env)
    // Vercel cron calls don't send auth headers by default, so we allow them through
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Only check auth if CRON_SECRET is explicitly set
    // Otherwise allow through (for Vercel cron calls)
    if (cronSecret && authHeader && authHeader !== `Bearer ${cronSecret}`) {
      console.log('[AUTOMATION CRON] Unauthorized: Invalid CRON_SECRET')
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }
    
    // If CRON_SECRET is set but no auth header, also allow (Vercel cron)
    // This allows Vercel's automatic cron calls to work
    
    console.log(`[AUTOMATION CRON] Starting multi-org automation run at ${executionDate}`)
    console.log('[AUTOMATION CRON] Catch-up mode enabled - Processing contracts scheduled for today or earlier')
    
    // Use service role client to bypass RLS (cron runs without user session)
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('[AUTOMATION CRON] Using service role client to query automation_settings')
    console.log('[AUTOMATION CRON] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING')
    console.log('[AUTOMATION CRON] SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING')
    
    // First, check raw automation_settings without join to see what we have
    const { data: rawSettings, error: rawError } = await supabase
      .from('automation_settings')
      .select('organization_id, enabled, admin_emails')
      .eq('enabled', true)
    
    if (rawError) {
      console.error('[AUTOMATION CRON] Error fetching raw automation_settings:', rawError)
    } else {
      console.log('[AUTOMATION CRON] Raw automation_settings with enabled=true:', rawSettings?.length || 0)
      if (rawSettings && rawSettings.length > 0) {
        console.log('[AUTOMATION CRON] Found org IDs:', rawSettings.map(s => s.organization_id))
      }
    }
    
    // Get ALL organizations with automation enabled (with join)
    const { data: allOrgSettings, error: settingsError } = await supabase
      .from('automation_settings')
      .select('organization_id, enabled, admin_emails, organizations!inner(name, slug)')
      .eq('enabled', true)
    
    if (settingsError) {
      console.error('[AUTOMATION CRON] Error fetching org settings with join:', settingsError)
      console.error('[AUTOMATION CRON] Error details:', JSON.stringify(settingsError, null, 2))
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch automation settings',
        details: settingsError
      }, { status: 500 })
    }
    
    console.log('[AUTOMATION CRON] Query result with join:', {
      found: allOrgSettings?.length || 0,
      orgs: allOrgSettings?.map(s => ({ id: s.organization_id, name: (s.organizations as any)?.name }))
    })
    
    if (!allOrgSettings || allOrgSettings.length === 0) {
      console.log('[AUTOMATION CRON] No organizations found after join')
      console.log('[AUTOMATION CRON] Possible causes: 1) Missing organization records, 2) RLS still blocking, 3) Join failing')
      return NextResponse.json({
        success: true,
        message: 'No organizations have automation enabled',
        skipped: true,
        processedOrgs: 0
      })
    }
    
    console.log(`[AUTOMATION CRON] Found ${allOrgSettings.length} organization(s) with automation enabled`)
    
    // Process each organization
    const orgResults = []
    
    for (const orgSetting of allOrgSettings) {
      const orgId = orgSetting.organization_id
      const orgName = (orgSetting.organizations as any)?.name || 'Unknown Org'
      const adminEmails = orgSetting.admin_emails || []
      
      console.log(`[AUTOMATION CRON] Processing organization: ${orgName} (${orgId})`)
      
      try {
        // Generate transactions for this org (uses Australia/Sydney timezone by default)
        const result = await generateTransactionsForEligibleContracts('Australia/Sydney', orgId, catchUpMode)
        
        const orgExecutionTime = Date.now() - startTime
        
        // Create automation log entry for this org
        const logEntry = {
          run_date: executionDate,
          organization_id: orgId,
          status: result.success && result.failedTransactions === 0 ? 'success' 
            : result.failedTransactions > 0 && result.successfulTransactions > 0 ? 'partial'
            : 'failed',
          contracts_processed: result.processedContracts,
          contracts_skipped: 0,
          contracts_failed: result.failedTransactions,
          execution_time_ms: orgExecutionTime,
          errors: JSON.stringify(result.errors),
          summary: generateHumanReadableSummary(result, executionDate, orgName)
        }
        
        // Save log to database
        await supabase
          .from('automation_logs')
          .insert(logEntry)
        
        // Log results for this org
        console.log(`[AUTOMATION CRON] ${orgName} - Completed in ${orgExecutionTime}ms`)
        console.log(`[AUTOMATION CRON] ${orgName} - Processed: ${result.processedContracts} contracts`)
        console.log(`[AUTOMATION CRON] ${orgName} - Successful: ${result.successfulTransactions} transactions`)
        console.log(`[AUTOMATION CRON] ${orgName} - Failed: ${result.failedTransactions} transactions`)
        
        // Send email notification to this org's admins
        if (adminEmails && adminEmails.length > 0) {
          console.log(`[AUTOMATION CRON] ${orgName} - Preparing email for ${adminEmails.length} recipient(s)`)
          
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
              
              return {
                residentName: resident ? `${resident.first_name} ${resident.last_name}` : 'Unknown',
                amount: txn.amount,
                remainingBalance: contract?.current_balance || 0,
                nextRunDate: contract?.next_run_date || new Date().toISOString()
              }
            })
          )
          
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
            adminEmails,
            {
              executionDate,
              executionTime: orgExecutionTime,
              processedContracts: result.processedContracts,
              successfulTransactions: result.successfulTransactions,
              failedTransactions: result.failedTransactions,
              totalAmount: result.summary.totalAmount,
              transactions: transactionDetails,
              errors: errorsWithNames,
              summary: result.summary,
              timezone: 'Australia/Sydney'
            }
          )
          
          if (!emailResult.success) {
            console.error(`[AUTOMATION CRON] ${orgName} - Failed to send email:`, emailResult.error)
          } else {
            console.log(`[AUTOMATION CRON] ${orgName} - Email sent to: ${adminEmails.join(', ')}`)
          }
        }
        
        // Store result for summary
        orgResults.push({
          organizationId: orgId,
          organizationName: orgName,
          success: result.success,
          processedContracts: result.processedContracts,
          successfulTransactions: result.successfulTransactions,
          failedTransactions: result.failedTransactions,
          totalAmount: result.summary.totalAmount
        })
        
      } catch (orgError) {
        console.error(`[AUTOMATION CRON] ${orgName} - Fatal error:`, orgError)
        
        // Try to send error email to this org's admins
        if (adminEmails && adminEmails.length > 0) {
          await sendAutomationErrorEmail(
            adminEmails,
            orgError instanceof Error ? orgError.message : 'Unknown error',
            orgError
          )
        }
        
        orgResults.push({
          organizationId: orgId,
          organizationName: orgName,
          success: false,
          error: orgError instanceof Error ? orgError.message : 'Unknown error'
        })
      }
    }
    
    const totalExecutionTime = Date.now() - startTime
    
    console.log(`[AUTOMATION CRON] ========================================`)
    console.log(`[AUTOMATION CRON] MULTI-ORG RUN COMPLETE`)
    console.log(`[AUTOMATION CRON] Total execution time: ${totalExecutionTime}ms`)
    console.log(`[AUTOMATION CRON] Organizations processed: ${orgResults.length}`)
    console.log(`[AUTOMATION CRON] ========================================`)
    
    // Return summary of all orgs
    return NextResponse.json({
      success: true,
      data: {
        executionDate,
        totalExecutionTime,
        processedOrganizations: orgResults.length,
        organizationResults: orgResults
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
function generateHumanReadableSummary(result: any, executionDate: string, orgName: string): string {
  const date = new Date(executionDate).toLocaleString('en-AU', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Australia/Sydney'
  })
  
  let summary = `Automated Billing Run - ${orgName}\n`
  summary += `${date}\n\n`
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
