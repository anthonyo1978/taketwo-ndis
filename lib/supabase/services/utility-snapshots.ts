import { createClient } from '../server'
import type { UtilitySnapshot, UtilitySnapshotCreateInput, UtilitySnapshotUpdateInput } from '../../../types/utility-snapshot'
import { getCurrentUserOrganizationId } from '../../utils/organization'

/**
 * Service class for managing utility snapshot data operations with Supabase.
 * Handles CRUD operations for property utility snapshots (time-series log).
 */
export class UtilitySnapshotService {
  private async getSupabase() {
    return await createClient()
  }

  /**
   * Convert database utility snapshot (snake_case) to frontend (camelCase)
   */
  private convertDbSnapshotToFrontend(dbSnapshot: any): UtilitySnapshot {
    return {
      id: dbSnapshot.id,
      organizationId: dbSnapshot.organization_id,
      propertyId: dbSnapshot.property_id,
      utilityType: dbSnapshot.utility_type,
      onCharge: dbSnapshot.on_charge,
      meterReading: dbSnapshot.meter_reading || undefined,
      readingUnit: dbSnapshot.reading_unit || undefined,
      readingAt: dbSnapshot.reading_at ? new Date(dbSnapshot.reading_at) : undefined,
      notes: dbSnapshot.notes || undefined,
      createdAt: new Date(dbSnapshot.created_at),
      updatedAt: new Date(dbSnapshot.updated_at)
    }
  }

  /**
   * Get all utility snapshots for a property
   * 
   * @param propertyId - The property ID
   * @param utilityType - Optional filter by utility type
   * @returns Promise resolving to array of snapshots (most recent first)
   */
  async getByPropertyId(propertyId: string, utilityType?: string): Promise<UtilitySnapshot[]> {
    try {
      const supabase = await this.getSupabase()
      
      let query = supabase
        .from('property_utility_snapshots')
        .select(`
          id, organization_id, property_id, utility_type, on_charge,
          meter_reading, reading_unit, reading_at, notes,
          created_at, updated_at
        `)
        .eq('property_id', propertyId)
      
      if (utilityType) {
        query = query.eq('utility_type', utilityType)
      }
      
      query = query.order('created_at', { ascending: false })
      
      const { data, error } = await query
      
      if (error) {
        console.error('Error fetching utility snapshots:', error)
        throw new Error(`Failed to fetch utility snapshots: ${error.message}`)
      }
      
      return (data || []).map(this.convertDbSnapshotToFrontend)
    } catch (error) {
      console.error('UtilitySnapshotService.getByPropertyId error:', error)
      throw error
    }
  }

  /**
   * Create a new utility snapshot
   * 
   * @param snapshot - The snapshot data to create
   * @returns Promise resolving to created snapshot
   */
  async create(snapshot: UtilitySnapshotCreateInput): Promise<UtilitySnapshot> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      
      if (!organizationId) {
        throw new Error('User organization not found. Please log in again.')
      }
      
      const dbSnapshot = {
        organization_id: organizationId,
        property_id: snapshot.propertyId,
        utility_type: snapshot.utilityType,
        on_charge: snapshot.onCharge,
        meter_reading: snapshot.meterReading,
        reading_unit: snapshot.readingUnit,
        reading_at: snapshot.readingAt,
        notes: snapshot.notes
      }
      
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('property_utility_snapshots')
        .insert([dbSnapshot])
        .select()
        .single()
      
      if (error) {
        console.error('Error creating utility snapshot:', error)
        throw new Error(`Failed to create utility snapshot: ${error.message}`)
      }
      
      return this.convertDbSnapshotToFrontend(data)
    } catch (error) {
      console.error('UtilitySnapshotService.create error:', error)
      throw error
    }
  }

  /**
   * Update a utility snapshot (minimal - notes only for MVP)
   * 
   * @param id - The snapshot ID
   * @param updates - The fields to update
   * @returns Promise resolving to updated snapshot
   */
  async update(id: string, updates: UtilitySnapshotUpdateInput): Promise<UtilitySnapshot> {
    try {
      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      }
      
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes
      
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('property_utility_snapshots')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating utility snapshot:', error)
        throw new Error(`Failed to update utility snapshot: ${error.message}`)
      }
      
      return this.convertDbSnapshotToFrontend(data)
    } catch (error) {
      console.error('UtilitySnapshotService.update error:', error)
      throw error
    }
  }

  /**
   * Delete a utility snapshot
   * 
   * @param id - The snapshot ID
   * @returns Promise resolving to true if deleted successfully
   */
  async delete(id: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from('property_utility_snapshots')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error('Error deleting utility snapshot:', error)
        throw new Error(`Failed to delete utility snapshot: ${error.message}`)
      }
      
      return true
    } catch (error) {
      console.error('UtilitySnapshotService.delete error:', error)
      throw error
    }
  }
}

/**
 * Singleton instance of UtilitySnapshotService
 */
export const utilitySnapshotService = new UtilitySnapshotService()

