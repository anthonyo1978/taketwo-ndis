import { NextRequest, NextResponse } from "next/server"
import { createClient } from "lib/supabase/server"
import { LoginCredentials, LoginResponse } from "lib/types/auth"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginCredentials

    // Basic validation
    if (!body.email || !body.password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" } as LoginResponse,
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Attempt to sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password
    })

    if (authError || !authData.user) {
      console.error('[LOGIN] Supabase Auth error:', authError?.message)
      return NextResponse.json(
        { success: false, error: "Invalid credentials" } as LoginResponse,
        { status: 401 }
      )
    }

    // Get user profile from users table
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single()

    // Update last login timestamp
    if (userProfile) {
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userProfile.id)
    }

    // Check if user is active
    if (userProfile && userProfile.status !== 'active') {
      // Sign them out immediately
      await supabase.auth.signOut()
      return NextResponse.json(
        { success: false, error: "Your account is not active. Please contact your administrator." } as LoginResponse,
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        name: userProfile 
          ? `${userProfile.first_name} ${userProfile.last_name}`
          : authData.user.email!.split("@")[0],
      },
    } as LoginResponse)

  } catch (error) {
    console.error("[LOGIN] Error:", error)
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." } as LoginResponse,
      { status: 500 }
    )
  }
}
