import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'

/**
 * Password Reset API Endpoint
 * Sends a password reset email via Supabase Auth
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

    // Send password reset email via Supabase Auth
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`,
    })

    if (error) {
      console.error('Password reset error:', error)
      // Return success even if user doesn't exist (security best practice)
      // Don't reveal if email exists in the system
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.'
      })
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

