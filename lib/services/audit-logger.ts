/**
 * Audit Logger Service
 * Handles logging of user actions to system_logs table
 */

import { createClient } from 'lib/supabase/server'
import { getCurrentUserOrganizationId } from 'lib/utils/organization'

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
 * Check if logging is enabled
 */
async function isLoggingEnabled(): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'logging_enabled')
      .single()

    return data?.setting_value === true
  } catch (error) {
    // If there's an error checking, default to enabled (fail-safe)
    console.error('[AUDIT LOG] Error checking logging status:', error)
    return true
  }
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
    // Check if logging is enabled (except for logging toggle itself)
    if (entityType !== 'setting' || action !== 'update') {
      const loggingEnabled = await isLoggingEnabled()
      if (!loggingEnabled) {
        return { success: true } // Silently skip logging
      }
    }

    // Get organization context (use default if not available, e.g., for system actions)
    const organizationId = await getCurrentUserOrganizationId()

    const supabase = await createClient()

    const { error } = await supabase
      .from('system_logs')
      .insert({
        user_id: userId,
        organization_id: organizationId || '00000000-0000-0000-0000-000000000000',
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

