/**
 * Email Notification Service
 * 
 * Sends email notifications for automation runs using Resend
 */

import { Resend } from 'resend'

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export interface AutomationEmailData {
  organizationName: string
  executionDate: string
  executionTime: number
  processedContracts: number
  successfulTransactions: number
  failedTransactions: number
  totalAmount: number
  totalSuccessAmount?: number
  totalFailedAmount?: number
  transactions: Array<{
    residentName: string
    amount: number
    remainingBalance: number
    nextRunDate: string
  }>
  errors: Array<{
    contractId: string
    residentId: string
    residentName?: string
    error: string
    details?: any
  }>
  summary: {
    totalAmount: number
    averageAmount: number
    frequencyBreakdown: Record<string, number>
  }
  timezone?: string // IANA timezone (e.g., "Australia/Sydney")
  tomorrowPreview?: Array<{
    residentName: string
    amount: number
    frequency: string
  }>
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

    // Log the email (always log for debugging)
    console.log('='.repeat(80))
    console.log('📧 EMAIL NOTIFICATION')
    console.log('='.repeat(80))
    console.log('To:', adminEmails.join(', '))
    console.log('Subject:', emailSubject)
    console.log('-'.repeat(80))
    console.log(emailBody)
    console.log('='.repeat(80))

    // Send email via Resend if configured
    if (!resend) {
      console.warn('⚠️ RESEND_API_KEY not configured - email not sent')
      return { success: false, error: 'RESEND_API_KEY not configured' }
    }

    if (!process.env.FROM_EMAIL) {
      console.warn('⚠️ FROM_EMAIL not configured - email not sent')
      return { success: false, error: 'FROM_EMAIL not configured' }
    }

    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: process.env.FROM_EMAIL,
        to: adminEmails,
        subject: emailSubject,
        html: emailBody
      })

      if (emailError) {
        console.error('❌ Resend API error:', emailError)
        return { success: false, error: emailError.message }
      }

      console.log('✅ Email sent successfully via Resend:', emailData)
      return { success: true }
    } catch (error) {
      console.error('❌ Failed to send email via Resend:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

  } catch (error) {
    console.error('Failed to send email notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Generate HTML email body - Simple table format
 */
function generateEmailBody(data: AutomationEmailData): string {
  const timezone = data.timezone || 'Australia/Sydney'
  const date = new Date(data.executionDate).toLocaleString('en-AU', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: timezone
  })
  
  // Calculate success and failed amounts
  const successAmount = data.totalSuccessAmount ?? data.totalAmount
  const failedAmount = data.totalFailedAmount ?? data.errors.reduce((sum, err) => sum + 0, 0)

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; margin: 0; padding: 20px; background: #f9fafb; }
    .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: #4f46e5; color: white; padding: 28px 32px; }
    .header h1 { margin: 0 0 4px 0; font-size: 26px; font-weight: 600; }
    .header .org-name { margin: 0 0 8px 0; font-size: 16px; opacity: 0.95; font-weight: 500; }
    .header p { margin: 0; opacity: 0.85; font-size: 14px; }
    .summary { padding: 32px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
    .summary-stats { display: flex; gap: 48px; justify-content: space-around; }
    .stat { flex: 1; text-align: center; min-width: 140px; }
    .stat-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px; font-weight: 600; }
    .stat-value { font-size: 28px; font-weight: 700; color: #4f46e5; line-height: 1.2; }
    .section-header { font-size: 18px; font-weight: 600; color: #1f2937; margin: 24px 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
    .totals-grid { display: flex; gap: 24px; margin: 20px 0; }
    .total-card { flex: 1; background: #f9fafb; border-radius: 8px; padding: 20px; border: 2px solid #e5e7eb; }
    .total-card.success { border-color: #10b981; background: #f0fdf4; }
    .total-card.failed { border-color: #ef4444; background: #fef2f2; }
    .total-card-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; font-weight: 600; }
    .total-card-value { font-size: 32px; font-weight: 700; margin: 8px 0; }
    .total-card.success .total-card-value { color: #059669; }
    .total-card.failed .total-card-value { color: #dc2626; }
    .total-card-subtitle { font-size: 14px; color: #6b7280; margin-top: 4px; }
    .content { padding: 24px 32px; }
    .preview-section { background: #fffbeb; border: 2px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .preview-header { font-size: 16px; font-weight: 600; color: #92400e; margin-bottom: 12px; }
    .preview-item { padding: 12px; background: white; border-radius: 6px; margin: 8px 0; display: flex; justify-content: space-between; align-items: center; border: 1px solid #fde68a; }
    .preview-name { font-weight: 600; color: #1f2937; }
    .preview-amount { font-weight: 700; color: #d97706; font-size: 16px; }
    .preview-frequency { font-size: 12px; color: #92400e; background: #fef3c7; padding: 4px 8px; border-radius: 4px; margin-left: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: #f3f4f6; padding: 12px; text-align: left; font-size: 11px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb; }
    td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    tr:last-child td { border-bottom: none; }
    .amount { font-weight: 600; color: #059669; }
    .balance { color: #6b7280; }
    .date { color: #6b7280; font-size: 13px; }
    .error-section { background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0; border-radius: 4px; }
    .error-item { padding: 8px 0; }
    .footer { padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Automated Billing Report</h1>
      <p class="org-name">${data.organizationName}</p>
      <p>${date}</p>
    </div>
    
    <div class="summary">
      <div class="summary-stats">
        <div class="stat">
          <div class="stat-label">Total Billed</div>
          <div class="stat-value">$${data.totalAmount.toFixed(2)}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Success</div>
          <div class="stat-value" style="color: #10b981;">${data.successfulTransactions}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Failed</div>
          <div class="stat-value" style="color: ${data.failedTransactions > 0 ? '#dc2626' : '#6b7280'};">${data.failedTransactions}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Contracts</div>
          <div class="stat-value">${data.processedContracts}</div>
        </div>
      </div>
    </div>
    
    <div class="content">
      ${data.successfulTransactions > 0 || data.failedTransactions > 0 ? `
      <div class="totals-grid">
        ${data.successfulTransactions > 0 ? `
        <div class="total-card success">
          <div class="total-card-label">✅ Successful Transactions</div>
          <div class="total-card-value">$${successAmount.toFixed(2)}</div>
          <div class="total-card-subtitle">${data.successfulTransactions} transaction${data.successfulTransactions !== 1 ? 's' : ''} created</div>
        </div>
        ` : ''}
        ${data.failedTransactions > 0 ? `
        <div class="total-card failed">
          <div class="total-card-label">❌ Failed Transactions</div>
          <div class="total-card-value">${data.failedTransactions}</div>
          <div class="total-card-subtitle">${data.failedTransactions} transaction${data.failedTransactions !== 1 ? 's' : ''} failed</div>
        </div>
        ` : ''}
      </div>
      ` : ''}
      
      ${data.transactions.length > 0 ? `
      <div class="section-header">✅ Successful Transactions</div>
      <table>
        <thead>
          <tr>
            <th>Resident</th>
            <th>Amount</th>
            <th>Remaining Balance</th>
            <th>Next Run Date</th>
          </tr>
        </thead>
        <tbody>
          ${data.transactions.map(txn => `
            <tr>
              <td>${txn.residentName}</td>
              <td class="amount">$${txn.amount.toFixed(2)}</td>
              <td class="balance">$${txn.remainingBalance.toFixed(2)}</td>
              <td class="date">${new Date(txn.nextRunDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : `
      <p style="color: #6b7280; text-align: center; padding: 20px;">No transactions processed</p>
      `}
      
      ${data.errors.length > 0 ? `
      <div class="section-header">⚠️ Failed Transactions</div>
      <div class="error-section">
        <strong style="color: #dc2626; font-size: 14px;">Errors (${data.errors.length})</strong>
        ${data.errors.map((error, index) => `
          <div class="error-item">
            <strong>${index + 1}.</strong> ${error.residentName || 'Unknown'}: ${error.error}
            ${error.details ? `
              <div style="margin-left: 20px; margin-top: 4px; font-size: 12px; color: #6b7280;">
                Details: ${typeof error.details === 'string' ? error.details : JSON.stringify(error.details, null, 2)}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}
      
      ${data.tomorrowPreview && data.tomorrowPreview.length > 0 ? `
      <div class="preview-section">
        <div class="preview-header">🔮 Tomorrow's Preview</div>
        <p style="color: #92400e; font-size: 14px; margin-bottom: 16px;">The following transactions are scheduled for tomorrow:</p>
        ${data.tomorrowPreview.map(preview => `
          <div class="preview-item">
            <div>
              <span class="preview-name">${preview.residentName}</span>
              <span class="preview-frequency">${preview.frequency}</span>
            </div>
            <div class="preview-amount">$${preview.amount.toFixed(2)}</div>
          </div>
        `).join('')}
        <p style="color: #92400e; font-size: 12px; margin-top: 16px; margin-bottom: 0;">
          <strong>Total Tomorrow:</strong> $${data.tomorrowPreview.reduce((sum, p) => sum + p.amount, 0).toFixed(2)} 
          (${data.tomorrowPreview.length} transaction${data.tomorrowPreview.length !== 1 ? 's' : ''})
        </p>
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <p><strong>All transactions are in DRAFT status and require manual approval.</strong></p>
      <p style="margin-top: 8px;">Automated NDIS Billing System • ${data.organizationName}</p>
    </div>
  </div>
</body>
</html>
  `
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

    // Send email via Resend if configured
    if (!resend) {
      console.warn('⚠️ RESEND_API_KEY not configured - error email not sent')
      return { success: false, error: 'RESEND_API_KEY not configured' }
    }

    if (!process.env.FROM_EMAIL) {
      console.warn('⚠️ FROM_EMAIL not configured - error email not sent')
      return { success: false, error: 'FROM_EMAIL not configured' }
    }

    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: process.env.FROM_EMAIL,
        to: adminEmails,
        subject: emailSubject,
        html: emailBody
      })

      if (emailError) {
        console.error('❌ Resend API error (error email):', emailError)
        return { success: false, error: emailError.message }
      }

      console.log('✅ Error email sent successfully via Resend:', emailData)
      return { success: true }
    } catch (error) {
      console.error('❌ Failed to send error email via Resend:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

  } catch (err) {
    console.error('Failed to send error email notification:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }
  }
}

