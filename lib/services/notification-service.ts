/**
 * Notification Service
 * Helper functions for creating notifications from n8n, automation, etc.
 * Uses service role client to bypass RLS
 */

import { createClient } from '@supabase/supabase-js'

interface CreateNotificationParams {
  organizationId: string
  title: string
  message: string
  icon?: string
  category?: 'system' | 'automation' | 'billing' | 'n8n' | 'user' | 'other'
  priority?: 'low' | 'medium' | 'high'
  actionUrl?: string
  metadata?: Record<string, any>
}

/**
 * Create a notification using service role (for n8n, automation, etc.)
 * This bypasses RLS and can be called from serverless functions
 */
export async function createNotification(params: CreateNotificationParams) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const {
    organizationId,
    title,
    message,
    icon,
    category = 'system',
    priority = 'medium',
    actionUrl,
    metadata = {}
  } = params

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      organization_id: organizationId,
      title,
      message,
      icon: icon || null,
      category,
      priority,
      action_url: actionUrl || null,
      metadata,
      read: false
    })
    .select()
    .single()

  if (error) {
    console.error('[NOTIFICATION SERVICE] Error creating notification:', error)
    throw error
  }

  return data
}

/**
 * Create multiple notifications in a batch
 */
export async function createNotifications(notifications: CreateNotificationParams[]) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const notificationsData = notifications.map(n => ({
    organization_id: n.organizationId,
    title: n.title,
    message: n.message,
    icon: n.icon || null,
    category: n.category || 'system',
    priority: n.priority || 'medium',
    action_url: n.actionUrl || null,
    metadata: n.metadata || {},
    read: false
  }))

  const { data, error } = await supabase
    .from('notifications')
    .insert(notificationsData)
    .select()

  if (error) {
    console.error('[NOTIFICATION SERVICE] Error creating notifications:', error)
    throw error
  }

  return data
}

