/**
 * Organization utilities for multi-tenancy
 * These helpers get the current user's organization context
 */

import { createClient } from 'lib/supabase/server'

/**
 * Get the organization_id for the currently authenticated user
 * Used in API routes to filter data by organization
 * 
 * @returns organization_id UUID or null if not authenticated
 */
export async function getCurrentUserOrganizationId(): Promise<string | null> {
  try {
    const supabase = await createClient()
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('[ORG CONTEXT] No authenticated user')
      return null
    }
    
    // Get user's organization from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()
    
    if (userError || !userData) {
      console.error('[ORG CONTEXT] Error fetching user organization:', userError)
      return null
    }
    
    return userData.organization_id
  } catch (error) {
    console.error('[ORG CONTEXT] Unexpected error:', error)
    return null
  }
}

/**
 * Get full organization details for the current user
 * Use this when you need organization name, plan, limits, etc.
 * 
 * @returns Organization object or null
 */
export async function getCurrentUserOrganization(): Promise<{
  id: string
  name: string
  slug: string
  subscription_status: string
  subscription_plan: string
  max_houses: number
  max_residents: number
  max_users: number
  features: any
} | null> {
  try {
    const organizationId = await getCurrentUserOrganizationId()
    
    if (!organizationId) {
      return null
    }
    
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()
    
    if (error || !data) {
      console.error('[ORG CONTEXT] Error fetching organization:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('[ORG CONTEXT] Unexpected error:', error)
    return null
  }
}

/**
 * Check if user has reached a limit for their plan
 * Used to enforce free tier restrictions
 * 
 * @param limitType - 'houses' | 'residents' | 'users'
 * @returns { allowed: boolean, current: number, max: number }
 */
export async function checkOrganizationLimit(
  limitType: 'houses' | 'residents' | 'users'
): Promise<{ allowed: boolean; current: number; max: number }> {
  try {
    const organization = await getCurrentUserOrganization()
    
    if (!organization) {
      return { allowed: false, current: 0, max: 0 }
    }
    
    const supabase = await createClient()
    let current = 0
    let max = 0
    
    // Get current count based on limit type
    switch (limitType) {
      case 'houses':
        const { count: houseCount } = await supabase
          .from('houses')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
        current = houseCount || 0
        max = organization.max_houses
        break
        
      case 'residents':
        const { count: residentCount } = await supabase
          .from('residents')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
        current = residentCount || 0
        max = organization.max_residents
        break
        
      case 'users':
        const { count: userCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
        current = userCount || 0
        max = organization.max_users
        break
    }
    
    return {
      allowed: current < max,
      current,
      max
    }
  } catch (error) {
    console.error('[ORG LIMITS] Error checking limit:', error)
    return { allowed: false, current: 0, max: 0 }
  }
}

/**
 * Check if a feature is enabled for the current organization
 * Used for plan-based feature gating
 * 
 * @param featureName - Name of the feature to check
 * @returns true if enabled, false otherwise
 */
export async function isFeatureEnabled(featureName: string): Promise<boolean> {
  try {
    const organization = await getCurrentUserOrganization()
    
    if (!organization || !organization.features) {
      return false
    }
    
    return organization.features[featureName] === true
  } catch (error) {
    console.error('[ORG FEATURES] Error checking feature:', error)
    return false
  }
}

/**
 * Default organization ID (for backward compatibility during migration)
 * This is the organization that all existing data belongs to
 */
export const DEFAULT_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000000'

