import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from 'lib/supabase/server'
import { getCurrentUserOrganizationId } from 'lib/utils/organization'
import { getCurrentUserId } from 'lib/services/audit-logger'

// Validation schemas
const createTodoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().optional(), // ISO date string
  notificationId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional()
})

/**
 * GET /api/todos
 * Get all todos for the current user's organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const organizationId = await getCurrentUserOrganizationId()
    const userId = await getCurrentUserId()
    
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'User organization not found' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'todo' | 'done'
    const view = searchParams.get('view') // 'today' | 'next7days' | 'all'

    let query = supabase
      .from('todos')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`user_id.is.null,user_id.eq.${userId}`) // User's own todos or org-wide todos
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: todos, error } = await query

    if (error) {
      console.error('[TODOS API] Error fetching todos:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch todos' },
        { status: 500 }
      )
    }

    // Filter by view if specified
    let filteredTodos = todos || []
    if (view === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      filteredTodos = filteredTodos.filter(todo => {
        if (!todo.due_date) return false
        const dueDate = new Date(todo.due_date)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate.getTime() === today.getTime()
      })
    } else if (view === 'next7days') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const sevenDaysLater = new Date(today)
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
      filteredTodos = filteredTodos.filter(todo => {
        if (!todo.due_date) return false
        const dueDate = new Date(todo.due_date)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate >= today && dueDate <= sevenDaysLater
      })
    }

    return NextResponse.json({
      success: true,
      data: filteredTodos
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
 * POST /api/todos
 * Create a new todo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = createTodoSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid todo data',
          details: validation.error.issues
        },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const organizationId = await getCurrentUserOrganizationId()
    const userId = await getCurrentUserId()

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'User organization not found' },
        { status: 401 }
      )
    }

    const { title, description, priority, dueDate, notificationId, metadata } = validation.data

    // Parse due date
    let dueDateValue: Date | null = null
    if (dueDate) {
      dueDateValue = new Date(dueDate)
      dueDateValue.setHours(0, 0, 0, 0)
    }

    const { data: todo, error } = await supabase
      .from('todos')
      .insert({
        organization_id: organizationId,
        user_id: userId, // User-specific todos
        title,
        description: description || null,
        priority,
        due_date: dueDateValue ? dueDateValue.toISOString().split('T')[0] : null,
        notification_id: notificationId || null,
        metadata: metadata || {},
        status: 'todo',
        created_by: userId
      })
      .select()
      .single()

    if (error) {
      console.error('[TODOS API] Error creating todo:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create todo' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: todo
    }, { status: 201 })

  } catch (error) {
    console.error('[TODOS API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

