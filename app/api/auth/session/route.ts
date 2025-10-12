import { NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'

/**
 * GET /api/auth/session
 * Returns the current authenticated user's session data
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Get current auth user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get user profile from users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, job_title, role, status')
      .eq('auth_user_id', authUser.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if user is active
    if (userProfile.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'User account is not active' },
        { status: 403 }
      )
    }

    // Return user session data
    return NextResponse.json({
      success: true,
      user: {
        id: userProfile.id,
        authId: authUser.id,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        email: userProfile.email,
        phone: userProfile.phone,
        jobTitle: userProfile.job_title,
        role: userProfile.role,
        initials: `${userProfile.first_name[0]}${userProfile.last_name[0]}`.toUpperCase()
      }
    })

  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

