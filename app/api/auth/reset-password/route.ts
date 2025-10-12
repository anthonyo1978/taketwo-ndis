import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { sendPasswordResetEmail } from 'lib/services/user-email-service'
import crypto from 'crypto'

/**
 * Password Reset API Endpoint
 * Sends a custom password reset email using Resend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { email: string }
    const { email } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Valid email address is required' 
        }, 
        { status: 400 }
      )
    }

    const supabase = await createClient()

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

    // Store the reset token in the database
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token: token,
        expires_at: expiresAt.toISOString(),
        used: false
      })

    if (tokenError) {
      console.error('Error storing reset token:', tokenError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to process password reset' 
        }, 
        { status: 500 }
      )
    }

    // Build the reset link
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const resetLink = `${baseUrl}/auth/reset-password?token=${token}`

    // Send custom password reset email
    const emailResult = await sendPasswordResetEmail(
      user.email,
      user.first_name,
      resetLink
    )

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error)
      // Still return success to user (security best practice)
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully'
    })

  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      }, 
      { status: 500 }
    )
  }
}

