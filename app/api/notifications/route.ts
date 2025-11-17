import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from 'lib/supabase/server'
import { getCurrentUserOrganizationId } from 'lib/utils/organization'
import { getCurrentUserId } from 'lib/services/audit-logger'

// Validation schemas
const createNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  icon: z.string().optional(),
  category: z.enum(['system', 'automation', 'billing', 'n8n', 'user', 'other']).default('system'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  actionUrl: z.string().url().optional().or(z.literal('')),
  metadata: z.record(z.any()).optional()
})

/**
 * GET /api/notifications
 * Get all notifications for the current user's organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const organizationId = await getCurrentUserOrganizationId()
    
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'User organization not found' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') // 'all' | 'unread'
    const category = searchParams.get('category')

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (filter === 'unread') {
      query = query.eq('read', false)
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error('[NOTIFICATIONS API] Error fetching notifications:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: notifications || []
    })

  } catch (error) {
    console.error('[NOTIFICATIONS API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications
 * Create a new notification (typically called by n8n or automation)
 * Note: For service role calls (n8n), use service role client directly
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = createNotificationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid notification data',
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

    const { title, message, icon, category, priority, actionUrl, metadata } = validation.data

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        organization_id: organizationId,
        title,
        message,
        icon: icon || null,
        category,
        priority,
        action_url: actionUrl || null,
        metadata: metadata || {},
        read: false,
        created_by: userId
      })
      .select()
      .single()

    if (error) {
      console.error('[NOTIFICATIONS API] Error creating notification:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create notification' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: notification
    }, { status: 201 })

  } catch (error) {
    console.error('[NOTIFICATIONS API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

