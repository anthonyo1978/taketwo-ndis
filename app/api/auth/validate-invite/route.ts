import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from 'lib/supabase/server'

/**
 * GET /api/auth/validate-invite?token=xxx
 * Validates an invitation token and returns user info.
 * Uses service role client because the user is not authenticated yet
 * (they're clicking the invite link for the first time).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    // Verify service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[VALIDATE INVITE] SUPABASE_SERVICE_ROLE_KEY is not set!')
      return NextResponse.json(
        { success: false, error: 'Server configuration error. Please contact your administrator.' },
        { status: 500 }
      )
    }

    const supabase = createServiceRoleClient()

    // Get invite with user details
    const { data: invite, error: inviteError } = await supabase
      .from('user_invites')
      .select(`
        *,
        user:users!inner(
          id,
          first_name,
          last_name,
          email,
          status
        )
      `)
      .eq('token', token)
      .is('used_at', null)
      .single()

    if (inviteError || !invite) {
      console.error('[VALIDATE INVITE] Token lookup failed:', { 
        error: inviteError?.message, 
        code: inviteError?.code,
        tokenPrefix: token.substring(0, 8) + '...' 
      })
      return NextResponse.json(
        { success: false, error: 'Invalid or expired invitation token. Please ask your administrator to resend the invite.' },
        { status: 404 }
      )
    }

    // Check if token is expired
    const now = new Date()
    const expiresAt = new Date(invite.expires_at)
    
    if (now > expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Invitation link has expired. Please contact your administrator.' },
        { status: 400 }
      )
    }

    // Check if user is already active
    if ((invite.user as any).status === 'active') {
      return NextResponse.json(
        { success: false, error: 'This account is already activated. Please use the login page.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        firstName: (invite.user as any).first_name,
        lastName: (invite.user as any).last_name,
        email: (invite.user as any).email
      }
    })

  } catch (error) {
    console.error('[VALIDATE INVITE] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

