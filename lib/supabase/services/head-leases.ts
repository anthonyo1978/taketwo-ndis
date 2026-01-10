import { createClient } from '../server'
import type { HeadLease, HeadLeaseCreateInput, HeadLeaseUpdateInput } from '../../../types/head-lease'
import { getCurrentUserOrganizationId } from '../../utils/organization'

/**
 * Service class for managing head lease data operations with Supabase.
 * Handles CRUD operations for property lease agreements.
 */
export class HeadLeaseService {
  private async getSupabase() {
    return await createClient()
  }

  /**
   * Convert database head lease (snake_case) to frontend head lease (camelCase)
   */
  private convertDbHeadLeaseToFrontend(dbLease: any): HeadLease {
    return {
      id: dbLease.id,
      organizationId: dbLease.organization_id,
      houseId: dbLease.house_id,
      ownerId: dbLease.owner_id,
      reference: dbLease.reference,
      startDate: new Date(dbLease.start_date),
      endDate: dbLease.end_date ? new Date(dbLease.end_date) : undefined,
      status: dbLease.status,
      rentAmount: dbLease.rent_amount ? parseFloat(dbLease.rent_amount) : undefined,
      rentFrequency: dbLease.rent_frequency,
      reviewDate: dbLease.review_date ? new Date(dbLease.review_date) : undefined,
      notes: dbLease.notes,
      documentUrl: dbLease.document_url,
      createdAt: new Date(dbLease.created_at),
      updatedAt: new Date(dbLease.updated_at),
      createdBy: dbLease.created_by,
      updatedBy: dbLease.updated_by,
      // Include owner if populated
      owner: dbLease.owner ? {
        id: dbLease.owner.id,
        organizationId: dbLease.owner.organization_id,
        name: dbLease.owner.name,
        ownerType: dbLease.owner.owner_type,
        primaryContactName: dbLease.owner.primary_contact_name,
        email: dbLease.owner.email,
        phone: dbLease.owner.phone,
        notes: dbLease.owner.notes,
        createdAt: new Date(dbLease.owner.created_at),
        updatedAt: new Date(dbLease.owner.updated_at),
        createdBy: dbLease.owner.created_by,
        updatedBy: dbLease.owner.updated_by
      } : undefined
    }
  }

  /**
   * Get all head leases for the current organization
   */
  async getAll(): Promise<HeadLease[]> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('head_leases')
        .select('*, owner:owners(*)')
        .eq('organization_id', organizationId)
        .order('start_date', { ascending: false })

      if (error) {
        console.error('Error fetching head leases:', error)
        throw new Error(`Failed to fetch head leases: ${error.message}`)
      }

      return (data || []).map(this.convertDbHeadLeaseToFrontend)
    } catch (error) {
      console.error('HeadLeaseService.getAll error:', error)
      throw error
    }
  }

  /**
   * Get head leases for a specific house
   * Returns active lease first, then by start_date desc
   */
  async getByHouseId(houseId: string): Promise<HeadLease[]> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('head_leases')
        .select('*, owner:owners(*)')
        .eq('house_id', houseId)
        .eq('organization_id', organizationId)
        .order('start_date', { ascending: false })

      if (error) {
        console.error('Error fetching head leases for house:', error)
        throw new Error(`Failed to fetch head leases: ${error.message}`)
      }

      // Sort by status priority (active first, then upcoming, then expired)
      const sorted = (data || []).sort((a, b) => {
        const statusPriority = { active: 1, upcoming: 2, expired: 3 }
        return statusPriority[a.status as keyof typeof statusPriority] - statusPriority[b.status as keyof typeof statusPriority]
      })

      return sorted.map(this.convertDbHeadLeaseToFrontend)
    } catch (error) {
      console.error('HeadLeaseService.getByHouseId error:', error)
      throw error
    }
  }

  /**
   * Get the current/active head lease for a specific house
   */
  async getCurrentForHouse(houseId: string): Promise<HeadLease | null> {
    try {
      const leases = await this.getByHouseId(houseId)
      // Return the first lease (which will be active if one exists, otherwise most recent)
      return leases.length > 0 ? leases[0] : null
    } catch (error) {
      console.error('HeadLeaseService.getCurrentForHouse error:', error)
      throw error
    }
  }

  /**
   * Get a single head lease by ID
   */
  async getById(id: string): Promise<HeadLease | null> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('head_leases')
        .select('*, owner:owners(*)')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        console.error('Error fetching head lease:', error)
        throw new Error(`Failed to fetch head lease: ${error.message}`)
      }

      return this.convertDbHeadLeaseToFrontend(data)
    } catch (error) {
      console.error('HeadLeaseService.getById error:', error)
      throw error
    }
  }

  /**
   * Create a new head lease
   */
  async create(input: HeadLeaseCreateInput): Promise<HeadLease> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const dbLease = {
        organization_id: organizationId,
        house_id: input.houseId,
        owner_id: input.ownerId,
        reference: input.reference,
        start_date: input.startDate,
        end_date: input.endDate,
        status: input.status,
        rent_amount: input.rentAmount,
        rent_frequency: input.rentFrequency,
        review_date: input.reviewDate,
        notes: input.notes,
        document_url: input.documentUrl
      }

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('head_leases')
        .insert([dbLease])
        .select('*, owner:owners(*)')
        .single()

      if (error) {
        console.error('Error creating head lease:', error)
        throw new Error(`Failed to create head lease: ${error.message}`)
      }

      return this.convertDbHeadLeaseToFrontend(data)
    } catch (error) {
      console.error('HeadLeaseService.create error:', error)
      throw error
    }
  }

  /**
   * Update an existing head lease
   */
  async update(id: string, input: HeadLeaseUpdateInput): Promise<HeadLease> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      }

      if (input.ownerId !== undefined) dbUpdates.owner_id = input.ownerId
      if (input.reference !== undefined) dbUpdates.reference = input.reference
      if (input.startDate !== undefined) dbUpdates.start_date = input.startDate
      if (input.endDate !== undefined) dbUpdates.end_date = input.endDate
      if (input.status !== undefined) dbUpdates.status = input.status
      if (input.rentAmount !== undefined) dbUpdates.rent_amount = input.rentAmount
      if (input.rentFrequency !== undefined) dbUpdates.rent_frequency = input.rentFrequency
      if (input.reviewDate !== undefined) dbUpdates.review_date = input.reviewDate
      if (input.notes !== undefined) dbUpdates.notes = input.notes
      if (input.documentUrl !== undefined) dbUpdates.document_url = input.documentUrl

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('head_leases')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select('*, owner:owners(*)')
        .single()

      if (error) {
        console.error('Error updating head lease:', error)
        throw new Error(`Failed to update head lease: ${error.message}`)
      }

      return this.convertDbHeadLeaseToFrontend(data)
    } catch (error) {
      console.error('HeadLeaseService.update error:', error)
      throw error
    }
  }

  /**
   * Delete a head lease
   */
  async delete(id: string): Promise<boolean> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from('head_leases')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId)

      if (error) {
        console.error('Error deleting head lease:', error)
        throw new Error(`Failed to delete head lease: ${error.message}`)
      }

      return true
    } catch (error) {
      console.error('HeadLeaseService.delete error:', error)
      throw error
    }
  }
}

/**
 * Singleton instance of HeadLeaseService
 */
export const headLeaseService = new HeadLeaseService()

