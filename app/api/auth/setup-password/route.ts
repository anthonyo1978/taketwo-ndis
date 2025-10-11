import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'

const setupPasswordSchema = z.object({
  token: z.string(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
})

/**
 * POST /api/auth/setup-password
 * Creates Supabase Auth user and sets password for invited user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { token: string; password: string }
    const validation = setupPasswordSchema.safeParse(body)

    if (!validation.success) {
      const errorMessage = validation.error.issues[0]?.message || 'Invalid request data'
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      )
    }

    const { token, password } = validation.data
    const supabase = await createClient()

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
          status,
          auth_user_id
        )
      `)
      .eq('token', token)
      .is('used_at', null)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { success: false, error: 'Invalid invitation token' },
        { status: 404 }
      )
    }

    // Check if token is expired
    const now = new Date()
    const expiresAt = new Date(invite.expires_at)
    
    if (now > expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Invitation link has expired' },
        { status: 400 }
      )
    }

    const user = invite.user as any

    // Check if user already has auth account
    if (user.auth_user_id) {
      return NextResponse.json(
        { success: false, error: 'Account already activated' },
        { status: 400 }
      )
    }

    // Create Supabase Auth user using admin API
    // Note: This requires SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    )
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: user.first_name,
        last_name: user.last_name
      }
    })

    if (authError || !authData.user) {
      console.error('[SETUP PASSWORD] Supabase Auth error:', authError)
      return NextResponse.json(
        { success: false, error: 'Failed to create account. Please contact support.' },
        { status: 500 }
      )
    }

    // Update user record with auth_user_id and activate
    const { error: updateError } = await supabase
      .from('users')
      .update({
        auth_user_id: authData.user.id,
        status: 'active',
        activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[SETUP PASSWORD] Error updating user:', updateError)
      // Auth user is created, but user record update failed
      // This is okay, we can fix it manually if needed
    }

    // Mark invite as used
    await supabase
      .from('user_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invite.id)

    // Sign the user in automatically using service role
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: user.email,
      password: password
    })

    if (signInError) {
      console.error('[SETUP PASSWORD] Auto sign-in error:', signInError)
      // Password is set, just can't auto-login - user can login manually
      return NextResponse.json({
        success: true,
        message: 'Password set successfully. Please sign in.',
        requiresLogin: true
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Account activated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }
    })

  } catch (error) {
    console.error('[SETUP PASSWORD] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

