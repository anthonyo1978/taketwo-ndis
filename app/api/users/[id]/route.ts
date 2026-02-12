import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from 'lib/supabase/server'

interface RouteParams {
  id: string
}

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  role: z.enum(['admin', 'staff', 'manager']).optional(),
  status: z.enum(['invited', 'active', 'inactive']).optional()
})

/**
 * GET /api/users/[id] - Get a specific user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: user
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
 * PUT /api/users/[id] - Update a user
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validation = updateUserSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid user data',
          details: validation.error.issues
        },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Build update object (snake_case for database)
    const updates: any = {
      updated_at: new Date().toISOString()
    }

    if (validation.data.firstName) updates.first_name = validation.data.firstName
    if (validation.data.lastName) updates.last_name = validation.data.lastName
    if (validation.data.email) updates.email = validation.data.email
    if (validation.data.phone !== undefined) updates.phone = validation.data.phone
    if (validation.data.jobTitle !== undefined) updates.job_title = validation.data.jobTitle
    if (validation.data.role) updates.role = validation.data.role
    if (validation.data.status) updates.status = validation.data.status

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[USERS API] Error updating user:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
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
 * DELETE /api/users/[id] - Hard delete a user (for testing)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get('hard') === 'true'

    if (hardDelete) {
      // Hard delete: completely remove user and related data
      
      
      // Delete invites first (foreign key constraint)
      await supabase.from('user_invites').delete().eq('user_id', id)
      
      // Delete user
      const { error } = await supabase.from('users').delete().eq('id', id)
      
      if (error) {
        console.error('[USERS API] Error deleting user:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to delete user' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        message: 'User deleted successfully'
      })
    } else {
      // Soft delete: set status to inactive
      const { data: deactivatedUser, error } = await supabase
        .from('users')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('[USERS API] Error deactivating user:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to deactivate user' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: deactivatedUser,
        message: 'User deactivated successfully'
      })
    }

  } catch (error) {
    console.error('[USERS API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

