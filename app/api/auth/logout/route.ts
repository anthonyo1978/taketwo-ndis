import { NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { getCurrentUserOrganizationId } from 'lib/utils/organization'

/**
 * POST /api/auth/logout
 * Logs out the current user and clears their session
 */
export async function POST() {
  try {
    const supabase = await createClient()

    // Get current user before logging out (for logging purposes)
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (authUser) {
      // Get user profile
      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .single()

      // Log the logout action
      if (userProfile) {
        const orgId = userProfile.organization_id || '00000000-0000-0000-0000-000000000000'
        await supabase
          .from('system_logs')
          .insert({
            user_id: userProfile.id,
            organization_id: orgId,
            entity_type: 'auth',
            action: 'logout',
            details: {
              timestamp: new Date().toISOString()
            }
          })
      }
    }

    // Sign out from Supabase Auth
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Logout error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to log out' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

