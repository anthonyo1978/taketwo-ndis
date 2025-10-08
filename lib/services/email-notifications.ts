/**
 * Email Notification Service
 * 
 * Sends email notifications for automation runs
 * 
 * TODO: Integrate with actual email service (Resend, SendGrid, AWS SES, etc.)
 * For now, logs notifications to console
 */

export interface AutomationEmailData {
  executionDate: string
  executionTime: number
  processedContracts: number
  successfulTransactions: number
  failedTransactions: number
  totalAmount: number
  errors: Array<{
    contractId: string
    residentId: string
    error: string
    details?: any
  }>
  summary: {
    totalAmount: number
    averageAmount: number
    frequencyBreakdown: Record<string, number>
  }
}

/**
 * Send automation completion email to admin
 */
export async function sendAutomationCompletionEmail(
  adminEmails: string[],
  data: AutomationEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Format the email content
    const emailSubject = data.failedTransactions > 0
      ? `⚠️ Automation Run Completed with Errors - ${data.successfulTransactions} Success, ${data.failedTransactions} Failed`
      : `✅ Automation Run Completed Successfully - ${data.successfulTransactions} Transactions Created`

    const emailBody = generateEmailBody(data)

    // Log the email (for now)
    console.log('='.repeat(80))
    console.log('📧 EMAIL NOTIFICATION')
    console.log('='.repeat(80))
    console.log('To:', adminEmails.join(', '))
    console.log('Subject:', emailSubject)
    console.log('-'.repeat(80))
    console.log(emailBody)
    console.log('='.repeat(80))

    // TODO: Replace with actual email service integration
    // Example with Resend:
    // const { data, error } = await resend.emails.send({
    //   from: 'automation@yourdomain.com',
    //   to: adminEmails,
    //   subject: emailSubject,
    //   html: emailBody
    // })

    // For now, just log and return success
    return { success: true }

  } catch (error) {
    console.error('Failed to send email notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Generate HTML email body
 */
function generateEmailBody(data: AutomationEmailData): string {
  const date = new Date(data.executionDate).toLocaleString('en-AU', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Australia/Sydney'
  })

  let body = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f7fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
    .summary-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat { display: inline-block; margin: 10px 20px 10px 0; }
    .stat-label { font-size: 12px; color: #718096; text-transform: uppercase; }
    .stat-value { font-size: 24px; font-weight: bold; color: #2d3748; }
    .success { color: #38a169; }
    .error { color: #e53e3e; }
    .warning { color: #d69e2e; }
    .section { margin: 20px 0; }
    .section-title { font-size: 16px; font-weight: bold; color: #2d3748; margin-bottom: 10px; }
    .error-list { background: #fff5f5; border-left: 4px solid #e53e3e; padding: 15px; margin: 10px 0; }
    .error-item { margin: 10px 0; }
    .footer { text-align: center; padding: 20px; color: #718096; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 Automated Billing Run Report</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">${date}</p>
    </div>
    
    <div class="content">
      <div class="summary-box">
        <div class="section-title">📊 Run Summary</div>
        <div style="margin-top: 20px;">
          <div class="stat">
            <div class="stat-label">Contracts Processed</div>
            <div class="stat-value">${data.processedContracts}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Successful</div>
            <div class="stat-value success">${data.successfulTransactions}</div>
          </div>
          ${data.failedTransactions > 0 ? `
          <div class="stat">
            <div class="stat-label">Failed</div>
            <div class="stat-value error">${data.failedTransactions}</div>
          </div>
          ` : ''}
          <div class="stat">
            <div class="stat-label">Total Amount</div>
            <div class="stat-value">$${data.totalAmount.toFixed(2)}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Execution Time</div>
            <div class="stat-value">${data.executionTime}ms</div>
          </div>
        </div>
      </div>

      ${Object.keys(data.summary.frequencyBreakdown).length > 0 ? `
      <div class="section">
        <div class="section-title">📈 Frequency Breakdown</div>
        <div class="summary-box">
          ${Object.entries(data.summary.frequencyBreakdown).map(([freq, count]) => `
            <div style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
              <strong>${freq}:</strong> ${count} transaction${count !== 1 ? 's' : ''}
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${data.errors.length > 0 ? `
      <div class="section">
        <div class="section-title error">⚠️ Errors (${data.errors.length})</div>
        <div class="error-list">
          ${data.errors.slice(0, 10).map((error, index) => `
            <div class="error-item">
              <strong>${index + 1}.</strong> Contract ${error.contractId.substring(0, 8)}...<br>
              <span style="color: #718096;">Error: ${error.error}</span>
            </div>
          `).join('')}
          ${data.errors.length > 10 ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #feb2b2;">
              <em>... and ${data.errors.length - 10} more errors</em>
            </div>
          ` : ''}
        </div>
      </div>
      ` : `
      <div class="section">
        <div style="text-align: center; padding: 20px; background: #f0fff4; border-radius: 8px; border: 1px solid #9ae6b4;">
          <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
          <div style="font-size: 18px; font-weight: bold; color: #38a169;">All Transactions Successful</div>
          <div style="color: #718096; margin-top: 5px;">No errors encountered during this run</div>
        </div>
      </div>
      `}

      <div class="section">
        <div class="section-title">📝 Important Note</div>
        <div class="summary-box">
          <p style="margin: 0; color: #718096;">
            All automated transactions are created in <strong>DRAFT</strong> status and require manual approval 
            before they are posted. Please review the transactions in your admin dashboard and approve them when ready.
          </p>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p>This is an automated message from your NDIS Management System</p>
      <p>Execution Date: ${data.executionDate}</p>
    </div>
  </div>
</body>
</html>
`

  return body
}

/**
 * Send error notification email
 */
export async function sendAutomationErrorEmail(
  adminEmails: string[],
  error: string,
  details?: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const emailSubject = '🚨 Automation Run Failed - Critical Error'

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #e53e3e; color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: #fff5f5; padding: 30px; border: 1px solid #feb2b2; border-top: none; }
    .error-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #e53e3e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Automation Run Failed</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">${new Date().toLocaleString('en-AU')}</p>
    </div>
    <div class="content">
      <div class="error-box">
        <h2 style="color: #e53e3e; margin-top: 0;">Critical Error</h2>
        <p><strong>Error:</strong> ${error}</p>
        ${details ? `<p><strong>Details:</strong> ${JSON.stringify(details, null, 2)}</p>` : ''}
        <p style="margin-top: 20px; color: #718096;">
          Please check the automation logs and system status immediately.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`

    console.log('='.repeat(80))
    console.log('🚨 ERROR EMAIL NOTIFICATION')
    console.log('='.repeat(80))
    console.log('To:', adminEmails.join(', '))
    console.log('Subject:', emailSubject)
    console.log('-'.repeat(80))
    console.log('Error:', error)
    console.log('Details:', details)
    console.log('='.repeat(80))

    // TODO: Replace with actual email service
    return { success: true }

  } catch (err) {
    console.error('Failed to send error email notification:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }
  }
}

