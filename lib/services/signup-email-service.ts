/**
 * Signup Email Service
 * Handles welcome emails for new organization signups
 */

import { Resend } from 'resend'

// Helper to get Resend client (initialized at runtime, not build time)
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY || process.env.RESEND_KEY
  
  if (!apiKey) {
    console.error('[SIGNUP EMAIL] RESEND_API_KEY not found in environment variables')
    return null
  }
  
  return new Resend(apiKey)
}

interface SignupEmailData {
  firstName: string
  lastName: string
  email: string
  organizationName: string
  organizationSlug: string
}

/**
 * Send welcome email to a new organization signup
 */
export async function sendSignupWelcomeEmail(data: SignupEmailData) {
  const { firstName, lastName, email, organizationName, organizationSlug } = data

  // Generate the base URL
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL 
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'http://localhost:3000'
  
  const loginUrl = `${baseUrl}/login`
  
  console.log('[SIGNUP EMAIL] Base URL:', baseUrl)
  console.log('[SIGNUP EMAIL] Login URL:', loginUrl)

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Haven</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
          <tr>
            <td align="center">
              <!-- Main container -->
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                
                <!-- Header with Haven branding -->
                <tr>
                  <td style="padding: 0; background: linear-gradient(to bottom, #87CEEB 0%, #5FA8D3 100%); height: 200px; position: relative; overflow: hidden;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="height: 200px; position: relative; z-index: 1;">
                      <tr>
                        <td align="center" style="padding: 40px;">
                          <h1 style="color: white; font-size: 48px; font-weight: bold; margin: 0 0 8px 0; text-shadow: 2px 2px 8px rgba(0,0,0,0.3); line-height: 1.2;">
                            Haven
                          </h1>
                          <p style="color: white; font-size: 18px; margin: 0; text-shadow: 1px 1px 4px rgba(0,0,0,0.3); line-height: 1.4;">
                            Running an SDA business made easy
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px;">
                    <h2 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">
                      Welcome to Haven, ${firstName}!
                    </h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                      Your organisation <strong>${organizationName}</strong> has been created successfully. You're all set to start managing your SDA business with Haven!
                    </p>
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <p style="color: #111827; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Your Account Details:</p>
                      <p style="color: #4b5563; font-size: 14px; margin: 4px 0;"><strong>Organisation:</strong> ${organizationName}</p>
                      <p style="color: #4b5563; font-size: 14px; margin: 4px 0;"><strong>Role:</strong> Administrator</p>
                      <p style="color: #4b5563; font-size: 14px; margin: 4px 0;"><strong>Email:</strong> ${email}</p>
                    </div>
                  </td>
                </tr>

                <!-- Login button -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                      You can now log in with the credentials you created to access your Haven dashboard:
                    </p>
                    <a 
                      href="${loginUrl}" 
                      style="display: inline-block; background-color: #4f46e5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3);"
                    >
                      Log in to Haven
                    </a>
                  </td>
                </tr>

                <!-- What you can do -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <p style="color: #111827; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
                      With Haven, you can:
                    </p>
                    <ul style="color: #4b5563; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>Create & manage residents and houses</li>
                      <li>Track NDIS funding contracts and balances</li>
                      <li>Automate billing and transaction creation</li>
                      <li>Submit claims automatically to the NDIA</li>
                      <li>Reconcile payments and track performance</li>
                      <li>Generate reports and export data</li>
                      <li>Manage team members and permissions</li>
                    </ul>
                  </td>
                </tr>

                <!-- Support -->
                <tr>
                  <td style="padding: 0 40px 40px 40px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                      Questions? Reply to this email - we're here to help!
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background: linear-gradient(to bottom, #87CEEB 0%, #5FA8D3 100%); text-align: center; position: relative; overflow: hidden;">
                    <p style="color: white; font-size: 14px; margin: 0; position: relative; z-index: 1;">
                      Welcome to the team! 🏡
                    </p>
                    <p style="color: rgba(255,255,255,0.9); font-size: 13px; margin: 8px 0 0 0; position: relative; z-index: 1;">
                      The Haven Team
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
`

  console.log('[SIGNUP EMAIL] Starting email send for:', email)
  console.log('[SIGNUP EMAIL] Organization:', organizationName)
  console.log('[SIGNUP EMAIL] Login URL:', loginUrl)
  console.log('[SIGNUP EMAIL] Checking for RESEND_API_KEY:', !!process.env.RESEND_API_KEY)
  console.log('[SIGNUP EMAIL] Checking for RESEND_KEY:', !!process.env.RESEND_KEY)
  
  try {
    const resend = getResendClient()
    
    if (!resend) {
      console.error('[SIGNUP EMAIL] Resend client not initialized - API key missing')
      console.error('[SIGNUP EMAIL] Available env vars with RESEND:', Object.keys(process.env).filter(k => k.includes('RESEND')).join(', ') || 'NONE')
      return {
        success: false,
        error: 'Email service not configured - RESEND_API_KEY not found'
      }
    }
    
    console.log('[SIGNUP EMAIL] Resend client ready')
    console.log('[SIGNUP EMAIL] FROM_EMAIL env var:', process.env.FROM_EMAIL || 'NOT SET')
    console.log('[SIGNUP EMAIL] RESEND_FROM_EMAIL env var:', process.env.RESEND_FROM_EMAIL || 'NOT SET')
    
    // Determine FROM address with detailed logging
    let fromAddress = process.env.FROM_EMAIL || process.env.RESEND_FROM_EMAIL
    
    if (!fromAddress) {
      // Fallback to onboarding@resend.dev but warn about limitations
      fromAddress = 'Haven <onboarding@resend.dev>'
      console.warn('⚠️ [SIGNUP EMAIL] FROM_EMAIL not configured - using Resend test domain')
      console.warn('⚠️ [SIGNUP EMAIL] Test domain can ONLY send to verified email addresses')
      console.warn('⚠️ [SIGNUP EMAIL] To fix: Add FROM_EMAIL env var with a verified domain in Vercel')
      console.warn('⚠️ [SIGNUP EMAIL] See SIGNUP-EMAIL-FIX.md for detailed instructions')
    }
    
    console.log('[SIGNUP EMAIL] Will send FROM:', fromAddress)
    console.log('[SIGNUP EMAIL] Will send TO:', email)
    console.log('[SIGNUP EMAIL] Subject:', `Welcome to Haven - ${organizationName} is Ready!`)

    const result = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: `Welcome to Haven - ${organizationName} is Ready!`,
      html: htmlContent,
      replyTo: 'anthonyo1978@gmail.com',
    })

    if (result.error) {
      console.error('[SIGNUP EMAIL] ❌ Failed to send email - Resend API error:', result.error)
      console.error('[SIGNUP EMAIL] Error details:', JSON.stringify(result.error, null, 2))
      
      // Check for common errors and provide helpful messages
      let errorMessage = result.error.message || 'Failed to send email via Resend'
      
      if (errorMessage.includes('onboarding@resend.dev') || errorMessage.includes('not verified')) {
        console.error('⚠️ [SIGNUP EMAIL] LIKELY CAUSE: Using test domain or unverified recipient')
        console.error('⚠️ [SIGNUP EMAIL] Solution 1: Add FROM_EMAIL env var with verified domain to Vercel')
        console.error('⚠️ [SIGNUP EMAIL] Solution 2: Verify recipient email in Resend dashboard')
        console.error('⚠️ [SIGNUP EMAIL] See SIGNUP-EMAIL-FIX.md for step-by-step instructions')
        errorMessage = `${errorMessage}. See SIGNUP-EMAIL-FIX.md for solutions.`
      }
      
      return {
        success: false,
        error: errorMessage
      }
    }

    if (!result.data) {
      console.error('[SIGNUP EMAIL] ❌ No data returned from Resend - email may not have been sent')
      return {
        success: false,
        error: 'No response from email service'
      }
    }

    console.log('[SIGNUP EMAIL] ✅ Email sent successfully to:', email)
    console.log('[SIGNUP EMAIL] ✅ Message ID:', result.data.id)
    console.log('[SIGNUP EMAIL] ✅ From:', fromAddress)
    return {
      success: true,
      messageId: result.data.id
    }

  } catch (error) {
    console.error('[SIGNUP EMAIL] Exception sending email:', error)
    console.error('[SIGNUP EMAIL] Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('[SIGNUP EMAIL] Error message:', error instanceof Error ? error.message : String(error))
    console.error('[SIGNUP EMAIL] Error stack:', error instanceof Error ? error.stack : 'No stack')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

