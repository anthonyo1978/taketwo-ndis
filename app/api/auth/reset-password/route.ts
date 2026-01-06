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

    console.log('🔒 [PASSWORD RESET] Request received for email (masked):', email.replace(/(.{2})(.*)(@.*)/, '$1***$3'))

    if (!email || !email.includes('@')) {
      console.log('❌ [PASSWORD RESET] Invalid email format')
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
      // Log for diagnostics but don't reveal to client
      console.log('⚠️ [PASSWORD RESET] User not found or error querying database')
      console.log('⚠️ [PASSWORD RESET] Error details:', userError?.message || 'User not found')
      console.log('⚠️ [PASSWORD RESET] This is expected if email not in system')
      
      // Return success even if user doesn't exist (security best practice)
      // Don't reveal if email exists in the system
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.'
      })
    }

    console.log('✅ [PASSWORD RESET] User found in database')

    // Generate a password reset token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // 1 hour expiry

    console.log('🔑 [PASSWORD RESET] Generated reset token (expires in 1 hour)')

    // Get user's organization from users table (they're not authenticated yet)
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()

    const userOrgId = userData?.organization_id || '00000000-0000-0000-0000-000000000000'

    console.log('🏢 [PASSWORD RESET] User organization ID retrieved')

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
      console.error('❌ [PASSWORD RESET] Error storing reset token:', tokenError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to process password reset' 
        }, 
        { status: 500 }
      )
    }

    console.log('✅ [PASSWORD RESET] Reset token stored in database')

    // Build the reset link - use hardcoded production URL for now
    const baseUrl = 'https://taketwo-ndis.vercel.app'
    const resetLink = `${baseUrl}/auth/reset-password?token=${token}`
    
    console.log('🔗 [PASSWORD RESET] Reset link generated')
    console.log('📧 [PASSWORD RESET] Preparing to send email...')

    // Send custom password reset email
    const emailResult = await sendPasswordResetEmail(
      user.email,
      user.first_name,
      resetLink
    )

    if (!emailResult.success) {
      console.error('❌ [PASSWORD RESET] Failed to send password reset email:', emailResult.error)
      // Still return success to user (security best practice)
    } else {
      console.log('✅ [PASSWORD RESET] Password reset email sent successfully!')
      console.log('📬 [PASSWORD RESET] Email ID:', emailResult.messageId)
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

