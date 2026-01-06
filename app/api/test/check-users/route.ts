import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'

/**
 * TEST ENDPOINT - Check what users exist in the system
 * 
 * Usage: GET /api/test/check-users
 * 
 * This will show you all users and their emails (for diagnostics only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    console.log('🔍 [USER CHECK] Checking users table...')

    // Get all users (limit to 20 for safety)
    const { data: users, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('❌ [USER CHECK] Error querying users:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    console.log(`✅ [USER CHECK] Found ${users?.length || 0} users`)

    // Mask emails for security in logs (but show full in response for diagnosis)
    users?.forEach(user => {
      console.log(`  - ${user.first_name} ${user.last_name}: ${user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`)
    })

    return NextResponse.json({
      success: true,
      count: users?.length || 0,
      users: users?.map(u => ({
        id: u.id,
        name: `${u.first_name} ${u.last_name}`,
        email: u.email,
        role: u.role,
        created: u.created_at
      }))
    })

  } catch (error) {
    console.error('❌ [USER CHECK] Exception:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

