import { createClient } from '../server'
import type { Owner, OwnerCreateInput, OwnerUpdateInput } from '../../../types/owner'
import { getCurrentUserOrganizationId } from '../../utils/organization'

/**
 * Service class for managing owner data operations with Supabase.
 * Handles CRUD operations for property owners.
 */
export class OwnerService {
  private async getSupabase() {
    return await createClient()
  }

  /**
   * Convert database owner (snake_case) to frontend owner (camelCase)
   */
  private convertDbOwnerToFrontend(dbOwner: any): Owner {
    return {
      id: dbOwner.id,
      organizationId: dbOwner.organization_id,
      name: dbOwner.name,
      ownerType: dbOwner.owner_type,
      primaryContactName: dbOwner.primary_contact_name,
      email: dbOwner.email,
      phone: dbOwner.phone,
      notes: dbOwner.notes,
      createdAt: new Date(dbOwner.created_at),
      updatedAt: new Date(dbOwner.updated_at),
      createdBy: dbOwner.created_by,
      updatedBy: dbOwner.updated_by
    }
  }

  /**
   * Get all owners for the current organization
   */
  async getAll(): Promise<Owner[]> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('owners')
        .select('id, organization_id, name, owner_type, primary_contact_name, email, phone, notes, created_at, updated_at, created_by, updated_by')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching owners:', error)
        throw new Error(`Failed to fetch owners: ${error.message}`)
      }

      return (data || []).map(this.convertDbOwnerToFrontend)
    } catch (error) {
      console.error('OwnerService.getAll error:', error)
      throw error
    }
  }

  /**
   * Get a single owner by ID
   */
  async getById(id: string): Promise<Owner | null> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('owners')
        .select('id, organization_id, name, owner_type, primary_contact_name, email, phone, notes, created_at, updated_at, created_by, updated_by')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        console.error('Error fetching owner:', error)
        throw new Error(`Failed to fetch owner: ${error.message}`)
      }

      return this.convertDbOwnerToFrontend(data)
    } catch (error) {
      console.error('OwnerService.getById error:', error)
      throw error
    }
  }

  /**
   * Create a new owner
   */
  async create(input: OwnerCreateInput): Promise<Owner> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const dbOwner = {
        organization_id: organizationId,
        name: input.name,
        owner_type: input.ownerType,
        primary_contact_name: input.primaryContactName,
        email: input.email,
        phone: input.phone,
        notes: input.notes
      }

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('owners')
        .insert([dbOwner])
        .select()
        .single()

      if (error) {
        console.error('Error creating owner:', error)
        throw new Error(`Failed to create owner: ${error.message}`)
      }

      return this.convertDbOwnerToFrontend(data)
    } catch (error) {
      console.error('OwnerService.create error:', error)
      throw error
    }
  }

  /**
   * Update an existing owner
   */
  async update(id: string, input: OwnerUpdateInput): Promise<Owner> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      }

      if (input.name !== undefined) dbUpdates.name = input.name
      if (input.ownerType !== undefined) dbUpdates.owner_type = input.ownerType
      if (input.primaryContactName !== undefined) dbUpdates.primary_contact_name = input.primaryContactName
      if (input.email !== undefined) dbUpdates.email = input.email
      if (input.phone !== undefined) dbUpdates.phone = input.phone
      if (input.notes !== undefined) dbUpdates.notes = input.notes

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('owners')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) {
        console.error('Error updating owner:', error)
        throw new Error(`Failed to update owner: ${error.message}`)
      }

      return this.convertDbOwnerToFrontend(data)
    } catch (error) {
      console.error('OwnerService.update error:', error)
      throw error
    }
  }

  /**
   * Delete an owner
   */
  async delete(id: string): Promise<boolean> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from('owners')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId)

      if (error) {
        console.error('Error deleting owner:', error)
        throw new Error(`Failed to delete owner: ${error.message}`)
      }

      return true
    } catch (error) {
      console.error('OwnerService.delete error:', error)
      throw error
    }
  }
}

/**
 * Singleton instance of OwnerService
 */
export const ownerService = new OwnerService()

