import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from 'lib/supabase/server'
import { getCurrentUserOrganizationId } from 'lib/utils/organization'
import { getCurrentUserId } from 'lib/services/audit-logger'

// Validation schema for PATCH request
const updateTodoSchema = z.object({
  status: z.enum(['todo', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional()
})

/**
 * PATCH /api/todos/[id]
 * Update a todo (e.g., change status, priority, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = updateTodoSchema.parse(await request.json())
    const supabase = await createClient()
    const organizationId = await getCurrentUserOrganizationId()
    const userId = await getCurrentUserId()

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'User organization not found' },
        { status: 401 }
      )
    }

    // Verify todo belongs to user's organization and user
    const { data: existing, error: fetchError } = await supabase
      .from('todos')
      .select('id, organization_id, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Todo not found' },
        { status: 404 }
      )
    }

    if (existing.organization_id !== organizationId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if user can access this todo (org-wide or user's own)
    if (existing.user_id !== null && existing.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Update todo
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (body.status !== undefined) {
      updateData.status = body.status
    }

    if (body.priority !== undefined) {
      updateData.priority = body.priority
    }

    if (body.title !== undefined) {
      updateData.title = body.title
    }

    if (body.description !== undefined) {
      updateData.description = body.description
    }

    if (body.dueDate !== undefined) {
      if (body.dueDate === null) {
        updateData.due_date = null
      } else {
        const dueDate = new Date(body.dueDate)
        dueDate.setHours(0, 0, 0, 0)
        updateData.due_date = dueDate.toISOString().split('T')[0]
      }
    }

    const { data: todo, error } = await supabase
      .from('todos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[TODOS API] Error updating todo:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update todo' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: todo
    })

  } catch (error) {
    console.error('[TODOS API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/todos/[id]
 * Delete a todo
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const organizationId = await getCurrentUserOrganizationId()
    const userId = await getCurrentUserId()

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'User organization not found' },
        { status: 401 }
      )
    }

    // Verify todo belongs to user's organization and user
    const { data: existing, error: fetchError } = await supabase
      .from('todos')
      .select('id, organization_id, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Todo not found' },
        { status: 404 }
      )
    }

    if (existing.organization_id !== organizationId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if user can access this todo (org-wide or user's own)
    if (existing.user_id !== null && existing.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[TODOS API] Error deleting todo:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete todo' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('[TODOS API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

