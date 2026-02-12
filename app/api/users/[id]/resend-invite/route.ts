import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { sendWelcomeEmail } from 'lib/services/user-email-service'

interface RouteParams {
  id: string
}

/**
 * POST /api/users/[id]/resend-invite - Resend welcome email to user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Only resend if user is still in invited status
    if (user.status !== 'invited') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot resend invite. User status is: ${user.status}` 
        },
        { status: 400 }
      )
    }

    // Generate new invite token
    const { data: tokenData } = await supabase.rpc('generate_invite_token')
    const token = tokenData as string
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Store new invite token
    const { error: inviteError } = await supabase
      .from('user_invites')
      .insert({
        user_id: user.id,
        token: token,
        expires_at: expiresAt.toISOString()
      })

    if (inviteError) {
      console.error('[USERS API] Error creating invite token:', inviteError)
      return NextResponse.json(
        { success: false, error: 'Failed to generate invite token' },
        { status: 500 }
      )
    }

    // Send welcome email
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL 
      ? process.env.NEXT_PUBLIC_SITE_URL
      : 'http://localhost:3000'
    
    const setupLink = `${baseUrl}/auth/setup-password?token=${token}`
    
    
    
    const emailResult = await sendWelcomeEmail({
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      setupLink,
      role: user.role
    })

    if (!emailResult.success) {
      console.error('[USERS API] Failed to send welcome email:', emailResult.error)
      return NextResponse.json(
        { success: false, error: 'Failed to send welcome email' },
        { status: 500 }
      )
    }

    // Update invited_at timestamp
    await supabase
      .from('users')
      .update({ invited_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      message: `Welcome email resent to ${user.email}`
    })

  } catch (error) {
    console.error('[USERS API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

