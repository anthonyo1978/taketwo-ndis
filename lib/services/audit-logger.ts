/**
 * Audit Logger Service
 * Handles logging of user actions to system_logs table
 */

import { createClient } from 'lib/supabase/server'

export type EntityType = 
  | 'house' 
  | 'resident' 
  | 'transaction' 
  | 'contract' 
  | 'user' 
  | 'setting'
  | 'automation'
  | 'auth'

export type Action = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'void'
  | 'renew'
  | 'expire'
  | 'view'
  | 'export'
  | 'login'
  | 'logout'
  | 'invite'
  | 'activate'
  | 'deactivate'

interface LogActionParams {
  userId: string
  entityType: EntityType
  entityId?: string
  action: Action
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * Log a user action to the system_logs table
 */
export async function logAction({
  userId,
  entityType,
  entityId,
  action,
  details,
  ipAddress,
  userAgent
}: LogActionParams): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('system_logs')
      .insert({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        action: action,
        details: details || null,
        ip_address: ipAddress || null,
        user_agent: userAgent || null
      })

    if (error) {
      console.error('[AUDIT LOG] Failed to log action:', error)
      return { success: false, error: error.message }
    }

    return { success: true }

  } catch (error) {
    console.error('[AUDIT LOG] Error logging action:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Helper to extract user ID from request
 * Used in API routes to get the current user for logging
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createClient()

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return null

    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single()

    return userProfile?.id || null

  } catch (error) {
    console.error('[AUDIT LOG] Error getting current user ID:', error)
    return null
  }
}

/**
 * Helper to extract IP address and user agent from request
 */
export function getRequestMetadata(request: Request): { 
  ipAddress?: string
  userAgent?: string 
} {
  return {
    ipAddress: request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                undefined,
    userAgent: request.headers.get('user-agent') || undefined
  }
}

