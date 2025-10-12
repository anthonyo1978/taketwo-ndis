import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'

/**
 * Validate Password Reset Token
 * Checks if a reset token is valid and not expired
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { token: string }
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if token exists and is valid
    const { data: resetToken, error } = await supabase
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used')
      .eq('token', token)
      .single()

    if (error || !resetToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid reset token' },
        { status: 400 }
      )
    }

    // Check if token has been used
    if (resetToken.used) {
      return NextResponse.json(
        { success: false, error: 'This reset link has already been used' },
        { status: 400 }
      )
    }

    // Check if token has expired
    const expiresAt = new Date(resetToken.expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This reset link has expired' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

