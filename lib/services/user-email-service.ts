/**
 * User Email Service
 * Handles welcome emails and user-related notifications
 */

import { Resend } from 'resend'

// Initialize Resend only if API key is available (prevents build-time errors)
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null

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
                
                <!-- Header with Haven image -->
                <tr>
                  <td style="padding: 0;">
                    <img 
                      src="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/assets/haven-welcome.png" 
                      alt="Haven" 
                      style="width: 100%; height: 200px; object-fit: cover; display: block;"
                    />
                    <!-- Overlay with brand -->
                    <div style="position: relative; margin-top: -200px; height: 200px; background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.5)); display: flex; align-items: center; justify-content: center; flex-direction: column;">
                      <h1 style="color: white; font-size: 48px; font-weight: bold; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">Haven</h1>
                      <p style="color: white; font-size: 18px; margin: 8px 0 0 0; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">Automate your SDA business</p>
                    </div>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px;">
                    <h2 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">
                      Welcome to Haven, ${firstName}!
                    </h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                      Your account has been created and you're ready to get started. We're excited to have you on the team!
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
                      <li>Manage residents and houses</li>
                      <li>Track funding contracts and balances</li>
                      <li>View automated billing transactions</li>
                      <li>Generate reports and export data</li>
                      <li>Configure system settings</li>
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

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px; background-color: #f9fafb; text-align: center;">
                    <p style="color: #9ca3af; font-size: 13px; margin: 0;">
                      Welcome to the team! 🏡
                    </p>
                    <p style="color: #9ca3af; font-size: 13px; margin: 8px 0 0 0;">
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
    if (!resend) {
      console.error('[USER EMAIL] Resend API key not configured')
      return {
        success: false,
        error: 'Email service not configured'
      }
    }

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Haven <onboarding@resend.dev>',
      to: email,
      subject: 'Welcome to Haven - Your Account is Ready',
      html: htmlContent,
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
    if (!resend) {
      return {
        success: false,
        error: 'Email service not configured'
      }
    }

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Haven <onboarding@resend.dev>',
      to: email,
      subject: 'Reminder: Complete Your Haven Account Setup',
      html: htmlContent,
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

