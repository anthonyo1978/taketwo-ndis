import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'
import { sendSignupWelcomeEmail } from 'lib/services/signup-email-service'

/**
 * Public organization and user signup endpoint
 * POST /api/auth/signup
 * 
 * Creates a new organization and its first admin user
 */

const signupSchema = z.object({
  // Organization details
  organizationName: z.string().min(1, 'Organization name is required'),
  
  // User details (this user becomes the admin)
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export async function POST(request: NextRequest) {
  try {
    console.log('[SIGNUP] Starting organization signup')
    
    const body = await request.json()
    const validation = signupSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }
    
    const { organizationName, firstName, lastName, email, phone, password } = validation.data
    
    // Create service role client for admin operations
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
    
    // Step 1: Check if email already exists in Auth AND in users table
    console.log('[SIGNUP] Checking if email exists')
    
    // Check Supabase Auth first
    const { data: authUsers, error: authCheckError } = await supabaseAdmin.auth.admin.listUsers()
    const existingAuthUser = authUsers?.users.find(u => u.email === email)
    
    if (existingAuthUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'An account with this email already exists. Please sign in instead.',
          code: 'email_exists'
        },
        { status: 400 }
      )
    }
    
    // Check users table
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()
    
    if (existingUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'An account with this email already exists. Please sign in instead.',
          code: 'email_exists'
        },
        { status: 400 }
      )
    }
    
    // Step 2: Generate organization slug from name
    let slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    
    // Check if slug is taken
    const { data: existingOrg } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()
    
    if (existingOrg) {
      // Append random suffix
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      slug = `${slug}-${randomSuffix}`
    }
    
    console.log('[SIGNUP] Creating organization:', slug)
    
    // Step 3: Create organization
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: organizationName,
        slug: slug,
        subscription_status: 'active',
        subscription_plan: 'free',
        max_houses: 5,
        max_residents: 20,
        max_users: 2
      })
      .select()
      .single()
    
    if (orgError) {
      console.error('[SIGNUP] Organization creation failed:', orgError)
      return NextResponse.json(
        { success: false, error: 'Failed to create organization' },
        { status: 500 }
      )
    }
    
    console.log('[SIGNUP] Organization created:', organization.id)
    
    // Step 4: Create Supabase Auth user
    console.log('[SIGNUP] Creating auth user')
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for public signup
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        organization_id: organization.id
      }
    })
    
    if (authError || !authUser.user) {
      console.error('[SIGNUP] Auth user creation failed:', authError)
      
      // Rollback: delete organization
      await supabaseAdmin
        .from('organizations')
        .delete()
        .eq('id', organization.id)
      
      return NextResponse.json(
        { success: false, error: 'Failed to create user account' },
        { status: 500 }
      )
    }
    
    console.log('[SIGNUP] Auth user created:', authUser.user.id)
    
    // Step 5: Create user record in database
    console.log('[SIGNUP] Creating user record')
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_user_id: authUser.user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        role: 'admin',
        status: 'active',
        organization_id: organization.id,
        activated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (userError) {
      console.error('[SIGNUP] User record creation failed:', userError)
      
      // Rollback: delete auth user and organization
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      await supabaseAdmin
        .from('organizations')
        .delete()
        .eq('id', organization.id)
      
      return NextResponse.json(
        { success: false, error: 'Failed to create user record' },
        { status: 500 }
      )
    }
    
    console.log('[SIGNUP] User record created:', user.id)
    
    // Step 6: Create default automation settings for this organization
    console.log('[SIGNUP] Creating automation settings')
    await supabaseAdmin
      .from('automation_settings')
      .insert({
        organization_id: organization.id,
        enabled: false,
        admin_emails: [email]
      })
      .select()
      .single()
    
    console.log('[SIGNUP] Signup completed successfully')
    
    // Step 7: Send welcome email (if Resend is properly configured)
    // Note: Currently limited by Resend free tier - can only send to verified emails
    console.log('[SIGNUP] Attempting to send welcome email')
    let emailSent = false
    let emailError = null
    
    try {
      const emailResult = await sendSignupWelcomeEmail({
        firstName,
        lastName,
        email,
        organizationName: organizationName,
        organizationSlug: slug
      })
      
      if (!emailResult.success) {
        console.error('[SIGNUP] Failed to send welcome email:', emailResult.error)
        emailError = emailResult.error
        console.log('[SIGNUP] Note: Resend free tier only sends to verified addresses')
        console.log('[SIGNUP] User can still log in with their credentials')
        // Don't fail the signup if email fails - user can still log in
      } else {
        console.log('[SIGNUP] Welcome email sent successfully to:', email)
        emailSent = true
      }
    } catch (emailErr) {
      console.error('[SIGNUP] Exception sending welcome email:', emailErr)
      emailError = emailErr instanceof Error ? emailErr.message : 'Unknown error'
      // Don't fail the signup if email fails - user can still log in
    }
    
    return NextResponse.json({
      success: true,
      data: {
        organizationId: organization.id,
        userId: user.id,
        email,
        emailSent,
        emailError: emailError || undefined,
        message: emailSent 
          ? 'Organization created successfully. Check your email for login instructions.'
          : 'Organization created successfully. You can log in with your credentials.' + (emailError ? ` (Email not sent: ${emailError})` : '')
      }
    }, { status: 201 })
    
  } catch (error) {
    console.error('[SIGNUP] Unexpected error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Signup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

