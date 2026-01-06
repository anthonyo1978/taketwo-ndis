import { createClient } from '../server'
import { getCurrentUserOrganizationId } from '../../utils/organization'
import type { OrganizationSettings, OrganizationSettingsUpdateInput } from '../../../types/organization'

/**
 * Service class for managing organization settings
 */
export class OrganizationService {
  private async getSupabase() {
    return await createClient()
  }

  /**
   * Convert database record (snake_case) to frontend format (camelCase)
   */
  private convertDbToFrontend(dbOrg: any): OrganizationSettings {
    return {
      id: dbOrg.id,
      organizationId: dbOrg.organization_id,
      organizationName: dbOrg.organization_name,
      abn: dbOrg.abn || undefined,
      email: dbOrg.email || undefined,
      phone: dbOrg.phone || undefined,
      website: dbOrg.website || undefined,
      addressLine1: dbOrg.address_line1 || undefined,
      addressLine2: dbOrg.address_line2 || undefined,
      suburb: dbOrg.suburb || undefined,
      state: dbOrg.state || undefined,
      postcode: dbOrg.postcode || undefined,
      country: dbOrg.country || 'Australia',
      logoUrl: dbOrg.logo_url || undefined,
      primaryColor: dbOrg.primary_color || '#4f46e5',
      createdAt: new Date(dbOrg.created_at),
      updatedAt: new Date(dbOrg.updated_at),
      createdBy: dbOrg.created_by,
      updatedBy: dbOrg.updated_by
    }
  }

  /**
   * Get organization settings for current user's organization
   */
  async getSettings(): Promise<OrganizationSettings | null> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      
      if (!organizationId) {
        throw new Error('User not authenticated or no organization found')
      }
      
      return await this.getByOrganizationId(organizationId)
    } catch (error) {
      console.error('OrganizationService.getSettings error:', error)
      throw error
    }
  }

  /**
   * Get organization settings by organization ID
   */
  async getByOrganizationId(organizationId: string = '00000000-0000-0000-0000-000000000000'): Promise<OrganizationSettings | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        console.error('Error fetching organization settings:', error)
        throw new Error(`Failed to fetch organization settings: ${error.message}`)
      }

      return this.convertDbToFrontend(data)
    } catch (error) {
      console.error('OrganizationService.getByOrganizationId error:', error)
      throw error
    }
  }

  /**
   * Update current user's organization settings
   */
  async updateSettings(updates: OrganizationSettingsUpdateInput): Promise<OrganizationSettings> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      
      if (!organizationId) {
        throw new Error('User not authenticated or no organization found')
      }
      
      return await this.update(organizationId, updates)
    } catch (error) {
      console.error('OrganizationService.updateSettings error:', error)
      throw error
    }
  }

  /**
   * Update organization settings
   */
  async update(organizationId: string, updates: OrganizationSettingsUpdateInput): Promise<OrganizationSettings> {
    try {
      const dbUpdates: any = {
        updated_at: new Date().toISOString(),
        updated_by: 'system' // TODO: Get from auth context
      }

      if (updates.organizationName !== undefined) dbUpdates.organization_name = updates.organizationName
      if (updates.abn !== undefined) dbUpdates.abn = updates.abn
      if (updates.email !== undefined) dbUpdates.email = updates.email
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone
      if (updates.website !== undefined) dbUpdates.website = updates.website
      if (updates.addressLine1 !== undefined) dbUpdates.address_line1 = updates.addressLine1
      if (updates.addressLine2 !== undefined) dbUpdates.address_line2 = updates.addressLine2
      if (updates.suburb !== undefined) dbUpdates.suburb = updates.suburb
      if (updates.state !== undefined) dbUpdates.state = updates.state
      if (updates.postcode !== undefined) dbUpdates.postcode = updates.postcode
      if (updates.country !== undefined) dbUpdates.country = updates.country
      if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl
      if (updates.primaryColor !== undefined) dbUpdates.primary_color = updates.primaryColor

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('organization_settings')
        .update(dbUpdates)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) {
        console.error('Error updating organization settings:', error)
        throw new Error(`Failed to update organization settings: ${error.message}`)
      }

      return this.convertDbToFrontend(data)
    } catch (error) {
      console.error('OrganizationService.update error:', error)
      throw error
    }
  }
}

export const organizationService = new OrganizationService()

