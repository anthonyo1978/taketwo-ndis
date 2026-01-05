import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

/**
 * TEST ENDPOINT - Send a test email to verify Resend configuration
 * 
 * Usage:
 * GET /api/test/send-email?to=your@email.com
 * 
 * This will send a test email and return diagnostic information
 */
export async function GET(request: NextRequest) {
  console.log('\n=================================')
  console.log('🧪 [EMAIL TEST] Starting email test...')
  console.log('=================================\n')

  try {
    // Get recipient from query param
    const searchParams = request.nextUrl.searchParams
    const recipientEmail = searchParams.get('to')

    if (!recipientEmail) {
      return NextResponse.json({
        success: false,
        error: 'Missing "to" parameter',
        usage: 'GET /api/test/send-email?to=your@email.com'
      }, { status: 400 })
    }

    // Check environment variables
    const resendApiKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.FROM_EMAIL || 'Haven <onboarding@resend.dev>'

    console.log('📧 [EMAIL TEST] Configuration Check:')
    console.log('  - RESEND_API_KEY:', resendApiKey ? `✅ Set (${resendApiKey.substring(0, 10)}...)` : '❌ NOT SET')
    console.log('  - FROM_EMAIL:', fromEmail ? `✅ ${fromEmail}` : '⚠️ Using fallback: onboarding@resend.dev')
    console.log('  - TO_EMAIL:', recipientEmail)

    if (!resendApiKey) {
      return NextResponse.json({
        success: false,
        error: 'RESEND_API_KEY not configured',
        diagnostic: {
          resendApiKey: '❌ NOT SET',
          fromEmail: fromEmail,
          solution: 'Add RESEND_API_KEY to Vercel environment variables'
        }
      }, { status: 500 })
    }

    // Initialize Resend
    const resend = new Resend(resendApiKey)
    console.log('✅ [EMAIL TEST] Resend client initialized')

    // Prepare test email
    const emailData = {
      from: fromEmail,
      to: recipientEmail,
      subject: '🧪 Test Email - Resend Configuration Test',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
                      <h1 style="margin: 0; color: white; font-size: 32px; font-weight: bold;">
                        🧪 Email Test Successful!
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px 0; color: #333; font-size: 24px;">
                        ✅ Your email configuration is working!
                      </h2>
                      
                      <p style="margin: 0 0 15px 0; color: #666; font-size: 16px; line-height: 1.6;">
                        This test email confirms that:
                      </p>
                      
                      <ul style="color: #666; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                        <li>✅ Resend API key is correctly configured</li>
                        <li>✅ FROM_EMAIL is set up properly</li>
                        <li>✅ Domain verification is complete</li>
                        <li>✅ Email delivery is functional</li>
                      </ul>
                      
                      <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0 0 10px 0; color: #333; font-weight: bold;">📋 Configuration Details:</p>
                        <p style="margin: 5px 0; color: #666; font-size: 14px; font-family: monospace;">
                          <strong>From:</strong> ${fromEmail}
                        </p>
                        <p style="margin: 5px 0; color: #666; font-size: 14px; font-family: monospace;">
                          <strong>To:</strong> ${recipientEmail}
                        </p>
                        <p style="margin: 5px 0; color: #666; font-size: 14px; font-family: monospace;">
                          <strong>Sent:</strong> ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })} (Sydney time)
                        </p>
                      </div>
                      
                      <p style="margin: 20px 0 0 0; color: #666; font-size: 16px; line-height: 1.6;">
                        You're all set! Your signup emails and automation notifications should now work correctly.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                      <p style="margin: 0; color: #999; font-size: 14px;">
                        This is an automated test email from your Haven NDIS application
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
🧪 Email Test Successful!

✅ Your email configuration is working!

This test email confirms that:
- ✅ Resend API key is correctly configured
- ✅ FROM_EMAIL is set up properly
- ✅ Domain verification is complete
- ✅ Email delivery is functional

Configuration Details:
- From: ${fromEmail}
- To: ${recipientEmail}
- Sent: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })} (Sydney time)

You're all set! Your signup emails and automation notifications should now work correctly.

---
This is an automated test email from your Haven NDIS application
      `
    }

    console.log('📤 [EMAIL TEST] Sending test email...')
    console.log('  From:', emailData.from)
    console.log('  To:', emailData.to)
    console.log('  Subject:', emailData.subject)

    // Send the email
    const result = await resend.emails.send(emailData)

    console.log('\n✅ [EMAIL TEST] Email sent successfully!')
    console.log('  Resend Email ID:', result.data?.id || 'N/A')
    console.log('\n=================================')
    console.log('🎉 [EMAIL TEST] Test completed successfully')
    console.log('=================================\n')

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully! Check your inbox.',
      data: {
        emailId: result.data?.id,
        from: fromEmail,
        to: recipientEmail,
        timestamp: new Date().toISOString(),
        resendDashboard: 'https://resend.com/emails'
      },
      diagnostic: {
        resendApiKey: '✅ Configured',
        fromEmail: fromEmail,
        deliveryStatus: 'Sent to Resend',
        nextSteps: [
          '1. Check your inbox (may take 1-2 minutes)',
          '2. Check spam folder if not in inbox',
          '3. View in Resend dashboard: https://resend.com/emails'
        ]
      }
    })

  } catch (error) {
    console.error('\n❌ [EMAIL TEST] Failed to send test email')
    console.error('Error:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('\n=================================\n')

    return NextResponse.json({
      success: false,
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : String(error),
      diagnostic: {
        resendApiKey: process.env.RESEND_API_KEY ? '✅ Set' : '❌ NOT SET',
        fromEmail: process.env.FROM_EMAIL || 'onboarding@resend.dev (fallback)',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        solution: 'Check Vercel logs for more details'
      }
    }, { status: 500 })
  }
}

