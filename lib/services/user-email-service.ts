/**
 * User Email Service
 * Handles welcome emails and user-related notifications
 */

import { Resend } from 'resend'

// Helper to get Resend client (initialized at runtime, not build time)
function getResendClient() {
  console.log('[USER EMAIL] All env vars (first 20):', Object.keys(process.env).slice(0, 20))
  console.log('[USER EMAIL] Env vars with EMAIL:', Object.keys(process.env).filter(k => k.includes('EMAIL')))
  console.log('[USER EMAIL] Env vars with RESEND:', Object.keys(process.env).filter(k => k.includes('RESEND')))
  console.log('[USER EMAIL] Env vars with FROM:', Object.keys(process.env).filter(k => k.includes('FROM')))
  console.log('[USER EMAIL] Checking for RESEND_API_KEY:', !!process.env.RESEND_API_KEY)
  console.log('[USER EMAIL] Checking for FROM_EMAIL:', !!process.env.FROM_EMAIL)
  
  const apiKey = process.env.RESEND_API_KEY || process.env.RESEND_KEY
  
  if (!apiKey) {
    console.error('[USER EMAIL] RESEND_API_KEY not found in environment variables')
    console.error('[USER EMAIL] Available env vars with RESEND:', Object.keys(process.env).filter(k => k.includes('RESEND')))
    console.error('[USER EMAIL] Total env vars count:', Object.keys(process.env).length)
    return null
  }
  
  console.log('[USER EMAIL] Resend API key found, initializing client')
  return new Resend(apiKey)
}

interface WelcomeEmailData {
  firstName: string
  lastName: string
  email: string
  setupLink: string
  role: string
}

/**
 * Send welcome email to a new user with password setup link
 */
export async function sendWelcomeEmail(data: WelcomeEmailData) {
  const { firstName, lastName, email, setupLink, role } = data

  // Generate the image URL
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL 
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'http://localhost:3000'
  
  const imageUrl = `${baseUrl}/assets/haven-email-header.jpg`
  
  console.log('[USER EMAIL] Base URL:', baseUrl)
  console.log('[USER EMAIL] Image URL:', imageUrl)
  console.log('[USER EMAIL] VERCEL_URL:', process.env.VERCEL_URL)
  console.log('[USER EMAIL] NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL)

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
                
                <!-- Header with Haven branding (night sky with stars) -->
                <tr>
                  <td style="padding: 0; background: linear-gradient(to top, #3b82f6 0%, #1e40af 50%, #1e3a8a 100%); height: 200px; position: relative; overflow: hidden;">
                    <!-- Stars background -->
                    <div style="position: absolute; inset: 0; background-image: radial-gradient(2px 2px at 20% 30%, white, transparent), radial-gradient(2px 2px at 60% 70%, white, transparent), radial-gradient(1px 1px at 50% 50%, white, transparent), radial-gradient(1px 1px at 80% 10%, white, transparent), radial-gradient(2px 2px at 90% 60%, white, transparent), radial-gradient(1px 1px at 33% 80%, white, transparent), radial-gradient(1px 1px at 15% 90%, white, transparent); background-size: 200% 200%; background-position: 0% 0%; opacity: 0.7;"></div>
                    <table width="100%" cellpadding="0" cellspacing="0" style="height: 200px; position: relative; z-index: 1;">
                      <tr>
                        <td align="center" style="padding: 40px;">
                          <h1 style="color: white; font-size: 48px; font-weight: bold; margin: 0 0 12px 0; text-shadow: 2px 2px 8px rgba(0,0,0,0.5);">
                            Haven
                          </h1>
                          <p style="color: white; font-size: 20px; margin: 0; text-shadow: 1px 1px 4px rgba(0,0,0,0.5);">
                            Automate your SDA business
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
                      Your account has been created and you're ready to get started. We're excited to have you on the team!
                    </p>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                      Your username is your email address: <strong style="color: #4f46e5;">${email}</strong>
                    </p>
                  </td>
                </tr>

                <!-- Role badge -->
                <tr>
                  <td style="padding: 0 40px 20px 40px;">
                    <div style="background-color: #ede9fe; border-radius: 8px; padding: 16px; display: inline-block;">
                      <p style="margin: 0; color: #5b21b6; font-size: 14px; font-weight: 500;">
                        👤 Your role: <strong>${role}</strong>
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Setup button -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                      Click the button below to set your password and access Haven:
                    </p>
                    <a 
                      href="${setupLink}" 
                      style="display: inline-block; background-color: #4f46e5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3);"
                    >
                      Set Password & Login
                    </a>
                  </td>
                </tr>

                <!-- What you can do -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <p style="color: #111827; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
                      Once you're in, you'll be able to:
                    </p>
                    <ul style="color: #4b5563; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>Create & manage residents and houses</li>
                      <li>Track funding contracts and balances</li>
                      <li>View automated billing transactions</li>
                      <li>Claim automatically from the NDIA & reconcile payments</li>
                      <li>Generate reports and export data</li>
                      <li>Configure system settings</li>
                      <li>...and so much more</li>
                    </ul>
                  </td>
                </tr>

                <!-- Support -->
                <tr>
                  <td style="padding: 0 40px 40px 40px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                      Need help getting started? Reply to this email or contact your administrator.
                    </p>
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 12px 0 0 0;">
                      <strong>Note:</strong> This link will expire in 7 days for security purposes.
                    </p>
                  </td>
                </tr>

                <!-- Footer with night sky -->
                <tr>
                  <td style="padding: 30px 40px; background: linear-gradient(to top, #3b82f6 0%, #1e40af 50%, #1e3a8a 100%); text-align: center; position: relative; overflow: hidden;">
                    <!-- Stars background -->
                    <div style="position: absolute; inset: 0; background-image: radial-gradient(2px 2px at 25% 40%, white, transparent), radial-gradient(1px 1px at 70% 20%, white, transparent), radial-gradient(1px 1px at 45% 60%, white, transparent), radial-gradient(2px 2px at 85% 75%, white, transparent), radial-gradient(1px 1px at 15% 80%, white, transparent); background-size: 200% 200%; opacity: 0.7;"></div>
                    <p style="color: white; font-size: 14px; margin: 0; position: relative; z-index: 1;">
                      Welcome to the team! 🏡
                    </p>
                    <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 8px 0 0 0; position: relative; z-index: 1;">
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

  try {
    const resend = getResendClient()
    
    if (!resend) {
      console.error('[USER EMAIL] Resend API key not configured')
      return {
        success: false,
        error: 'Email service not configured'
      }
    }

    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'Haven <onboarding@resend.dev>',
      to: email,
      subject: 'Welcome to Haven - Your Account is Ready',
      html: htmlContent,
      replyTo: 'anthonyo1978@gmail.com', // Users can reply to your email
    })

    if (result.error) {
      console.error('[USER EMAIL] Failed to send welcome email:', result.error)
      return {
        success: false,
        error: result.error.message
      }
    }

    console.log('[USER EMAIL] Welcome email sent to:', email)
    return {
      success: true,
      messageId: result.data?.id
    }

  } catch (error) {
    console.error('[USER EMAIL] Error sending welcome email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Send password reset reminder email
 */
export async function sendPasswordResetReminder(email: string, firstName: string, setupLink: string) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Reminder: Set Your Haven Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; padding: 40px;">
                <tr>
                  <td>
                    <h2 style="color: #111827; font-size: 24px; margin: 0 0 16px 0;">Hi ${firstName},</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                      You haven't completed your Haven account setup yet. Your invitation is still waiting!
                    </p>
                    <a 
                      href="${setupLink}" 
                      style="display: inline-block; background-color: #4f46e5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;"
                    >
                      Complete Setup Now
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  try {
    const resend = getResendClient()
    
    if (!resend) {
      return {
        success: false,
        error: 'Email service not configured'
      }
    }

    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'Haven <onboarding@resend.dev>',
      to: email,
      subject: 'Reminder: Complete Your Haven Account Setup',
      html: htmlContent,
      replyTo: 'anthonyo1978@gmail.com',
    })

    return {
      success: !result.error,
      error: result.error?.message
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

