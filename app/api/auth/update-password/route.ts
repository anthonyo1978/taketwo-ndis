import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Update Password After Reset
 * Updates the user's password using a valid reset token
 * 
 * NOTE: Uses service role client to bypass RLS since users are not authenticated
 * during password reset
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { token: string; password: string }
    const { token, password } = body

    console.log('🔐 [UPDATE PASSWORD] Password update request received')

    if (!token || !password) {
      console.log('❌ [UPDATE PASSWORD] Missing token or password')
      return NextResponse.json(
        { success: false, error: 'Token and password are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8 || 
        !/[A-Z]/.test(password) || 
        !/[a-z]/.test(password) || 
        !/[0-9]/.test(password)) {
      console.log('❌ [UPDATE PASSWORD] Password does not meet requirements')
      return NextResponse.json(
        { success: false, error: 'Password does not meet requirements' },
        { status: 400 }
      )
    }

    console.log('✅ [UPDATE PASSWORD] Password meets requirements')

    // Use service role client to bypass RLS (user not authenticated during reset)
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

    console.log('✅ [UPDATE PASSWORD] Service role client initialized')

    // Check if token exists and is valid
    const { data: resetToken, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used')
      .eq('token', token)
      .single()

    if (tokenError || !resetToken) {
      console.log('❌ [UPDATE PASSWORD] Invalid or missing reset token')
      return NextResponse.json(
        { success: false, error: 'Invalid reset token' },
        { status: 400 }
      )
    }

    console.log('✅ [UPDATE PASSWORD] Reset token found and valid')

    // Check if token has been used
    if (resetToken.used) {
      console.log('❌ [UPDATE PASSWORD] Reset token already used')
      return NextResponse.json(
        { success: false, error: 'This reset link has already been used' },
        { status: 400 }
      )
    }

    // Check if token has expired
    const expiresAt = new Date(resetToken.expires_at)
    if (expiresAt < new Date()) {
      console.log('❌ [UPDATE PASSWORD] Reset token expired')
      return NextResponse.json(
        { success: false, error: 'This reset link has expired' },
        { status: 400 }
      )
    }

    console.log('✅ [UPDATE PASSWORD] Token is valid and not expired')

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('auth_user_id, email')
      .eq('id', resetToken.user_id)
      .single()

    if (userError || !user) {
      console.log('❌ [UPDATE PASSWORD] User not found for token')
      console.log('❌ [UPDATE PASSWORD] Error:', userError?.message || 'No user')
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    console.log('✅ [UPDATE PASSWORD] User found, updating password in Auth...')

    // Update password in Supabase Auth (service role client already initialized above)
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.auth_user_id,
      { password: password }
    )

    if (updateError) {
      console.error('❌ [UPDATE PASSWORD] Failed to update password in Auth:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update password' },
        { status: 500 }
      )
    }

    console.log('✅ [UPDATE PASSWORD] Password updated in Auth successfully')

    // Mark token as used
    const { error: markUsedError } = await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', resetToken.id)

    if (markUsedError) {
      console.error('⚠️ [UPDATE PASSWORD] Failed to mark token as used:', markUsedError)
      // Don't fail the request - password is already updated
    } else {
      console.log('✅ [UPDATE PASSWORD] Reset token marked as used')
    }

    console.log('🎉 [UPDATE PASSWORD] Password reset completed successfully!')

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    })

  } catch (error) {
    console.error('❌ [UPDATE PASSWORD] Exception during password update:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

