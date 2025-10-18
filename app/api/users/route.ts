import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from 'lib/supabase/server'
import { sendWelcomeEmail } from 'lib/services/user-email-service'
import { getCurrentUserOrganizationId } from 'lib/utils/organization'

// Validation schemas
const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  role: z.enum(['admin', 'staff', 'manager']).default('staff'),
  sendWelcomeEmail: z.boolean().default(true)
})

/**
 * GET /api/users - List all users
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: users, error } = await query

    if (error) {
      console.error('[USERS API] Error fetching users:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: users
    })

  } catch (error) {
    console.error('[USERS API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/users - Create a new user
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[USERS API] POST /api/users - Starting user creation')
    const body = await request.json()
    console.log('[USERS API] Request body:', JSON.stringify(body, null, 2))
    
    const validation = createUserSchema.safeParse(body)

    if (!validation.success) {
      console.log('[USERS API] Validation failed:', validation.error.issues)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid user data',
          details: validation.error.issues
        },
        { status: 400 }
      )
    }

    const { firstName, lastName, email, phone, jobTitle, role, sendWelcomeEmail: shouldSendEmail } = validation.data
    console.log('[USERS API] Creating user:', email, 'Role:', role)

    const supabase = await createClient()
    console.log('[USERS API] Supabase client created')

    // Get inviter's organization (new user joins same org as inviter)
    const organizationId = await getCurrentUserOrganizationId()
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'User organization not found. Please log in again.' },
        { status: 401 }
      )
    }
    console.log('[USERS API] Organization context:', organizationId)

    // Check if user with this email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, status')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: `A user with email ${email} already exists (Status: ${existingUser.status})`
        },
        { status: 400 }
      )
    }

    // Create user record
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone || null,
        job_title: jobTitle || null,
        role: role,
        status: 'invited',
        invited_at: new Date().toISOString(),
        organization_id: organizationId // New user joins inviter's organization
      })
      .select()
      .single()

    if (userError) {
      console.error('[USERS API] Error creating user:', userError)
      return NextResponse.json(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // Generate invite token (expires in 7 days)
    const { data: tokenData } = await supabase
      .rpc('generate_invite_token')

    const token = tokenData as string
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

    // Store invite token
    const { error: inviteError } = await supabase
      .from('user_invites')
      .insert({
        user_id: newUser.id,
        token: token,
        expires_at: expiresAt.toISOString()
      })

    if (inviteError) {
      console.error('[USERS API] Error creating invite:', inviteError)
      // Don't fail the request, just log it
    }

    // Send welcome email if requested
    if (shouldSendEmail && token) {
      // Generate setup link using Vercel URL or public site URL
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_SITE_URL 
        ? process.env.NEXT_PUBLIC_SITE_URL
        : 'http://localhost:3000'
      
      const setupLink = `${baseUrl}/auth/setup-password?token=${token}`
      
      console.log('[USERS API] Setup link:', setupLink)
      
      const emailResult = await sendWelcomeEmail({
        firstName,
        lastName,
        email,
        setupLink,
        role
      })

      if (!emailResult.success) {
        console.error('[USERS API] Failed to send welcome email:', emailResult.error)
        // Don't fail the request, user is created successfully
      } else {
        console.log('[USERS API] Welcome email sent to:', email)
      }
    }

    return NextResponse.json({
      success: true,
      data: newUser,
      message: shouldSendEmail 
        ? `User created and welcome email sent to ${email}`
        : 'User created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('[USERS API] Unexpected error in POST:', error)
    console.error('[USERS API] Error details:', error instanceof Error ? error.message : 'Unknown')
    console.error('[USERS API] Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

