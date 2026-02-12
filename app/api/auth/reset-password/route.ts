import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { sendPasswordResetEmail } from 'lib/services/user-email-service'
import crypto from 'crypto'

/**
 * Password Reset API Endpoint
 * Sends a custom password reset email using Resend
 * 
 * NOTE: Uses service role client to bypass RLS since users are not authenticated
 * when requesting password reset
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { email: string }
    const { email } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid email address is required' }, 
        { status: 400 }
      )
    }

    // Use service role client to bypass RLS (users aren't authenticated during password reset)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    )

    // Check if user exists in our users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, first_name, email')
      .eq('email', email)
      .single()

    if (userError || !user) {
      // Return success even if user doesn't exist (security best practice)
      // Don't reveal if email exists in the system
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.'
      })
    }

    // Generate a password reset token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // 1 hour expiry

    // Get user's organization from users table (they're not authenticated yet)
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()

    const userOrgId = userData?.organization_id || '00000000-0000-0000-0000-000000000000'

    // Store the reset token in the database
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token: token,
        organization_id: userOrgId,
        expires_at: expiresAt.toISOString(),
        used: false
      })

    if (tokenError) {
      console.error('[PASSWORD RESET] Error storing reset token:', tokenError)
      return NextResponse.json(
        { success: false, error: 'Failed to process password reset' }, 
        { status: 500 }
      )
    }

    // Build the reset link
    const baseUrl = 'https://taketwo-ndis.vercel.app'
    const resetLink = `${baseUrl}/auth/reset-password?token=${token}`

    // Send custom password reset email
    const emailResult = await sendPasswordResetEmail(
      user.email,
      user.first_name,
      resetLink
    )

    if (!emailResult.success) {
      console.error('[PASSWORD RESET] Failed to send email:', emailResult.error)
      // Still return success to user (security best practice)
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully'
    })

  } catch (error) {
    console.error('[PASSWORD RESET] Exception:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
