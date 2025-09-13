import { createClient } from '../client'
import type { House } from '@/types/house'

export class HouseService {
  private supabase = createClient()

  /**
   * Convert database house (snake_case) to frontend house (camelCase)
   */
  private convertDbHouseToFrontend(dbHouse: any): House {
    return {
      id: dbHouse.id,
      address1: dbHouse.address1,
      address2: dbHouse.address2,
      suburb: dbHouse.suburb,
      state: dbHouse.state,
      postcode: dbHouse.postcode,
      unit: dbHouse.unit,
      country: dbHouse.country,
      status: dbHouse.status,
      notes: dbHouse.notes,
      goLiveDate: dbHouse.go_live_date, // Convert snake_case to camelCase
      resident: dbHouse.resident,
      createdAt: new Date(dbHouse.created_at),
      createdBy: 'system', // Default value since we don't have this in DB yet
      updatedAt: new Date(dbHouse.updated_at),
      updatedBy: 'system' // Default value since we don't have this in DB yet
    }
  }

  /**
   * Get all houses from Supabase
   */
  async getAll(): Promise<House[]> {
    try {
      const { data, error } = await this.supabase
        .from('houses')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching houses:', error)
        throw new Error(`Failed to fetch houses: ${error.message}`)
      }

      // Convert snake_case to camelCase for frontend
      return (data || []).map(this.convertDbHouseToFrontend)
    } catch (error) {
      console.error('HouseService.getAll error:', error)
      throw error
    }
  }

  /**
   * Get a house by ID
   */
  async getById(id: string): Promise<House | null> {
    try {
      const { data, error } = await this.supabase
        .from('houses')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // House not found
        }
        console.error('Error fetching house:', error)
        throw new Error(`Failed to fetch house: ${error.message}`)
      }

      return data ? this.convertDbHouseToFrontend(data) : null
    } catch (error) {
      console.error('HouseService.getById error:', error)
      throw error
    }
  }

  /**
   * Create a new house
   */
  async create(house: Omit<House, 'id' | 'createdAt' | 'updatedAt'>): Promise<House> {
    try {
      // Convert camelCase to snake_case for database
      const dbHouse = {
        address1: house.address1,
        address2: house.address2,
        suburb: house.suburb,
        state: house.state,
        postcode: house.postcode,
        unit: house.unit,
        country: house.country,
        status: house.status,
        notes: house.notes,
        go_live_date: house.goLiveDate, // Convert camelCase to snake_case
        resident: house.resident
      }

      const { data, error } = await this.supabase
        .from('houses')
        .insert([dbHouse])
        .select()
        .single()

      if (error) {
        console.error('Error creating house:', error)
        throw new Error(`Failed to create house: ${error.message}`)
      }

      return this.convertDbHouseToFrontend(data)
    } catch (error) {
      console.error('HouseService.create error:', error)
      throw error
    }
  }

  /**
   * Update a house
   */
  async update(id: string, updates: Partial<Omit<House, 'id' | 'createdAt' | 'updatedAt'>>): Promise<House> {
    try {
      // Convert camelCase to snake_case for database
      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      }

      if (updates.address1 !== undefined) dbUpdates.address1 = updates.address1
      if (updates.address2 !== undefined) dbUpdates.address2 = updates.address2
      if (updates.suburb !== undefined) dbUpdates.suburb = updates.suburb
      if (updates.state !== undefined) dbUpdates.state = updates.state
      if (updates.postcode !== undefined) dbUpdates.postcode = updates.postcode
      if (updates.unit !== undefined) dbUpdates.unit = updates.unit
      if (updates.country !== undefined) dbUpdates.country = updates.country
      if (updates.status !== undefined) dbUpdates.status = updates.status
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes
      if (updates.goLiveDate !== undefined) dbUpdates.go_live_date = updates.goLiveDate
      if (updates.resident !== undefined) dbUpdates.resident = updates.resident

      const { data, error } = await this.supabase
        .from('houses')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating house:', error)
        throw new Error(`Failed to update house: ${error.message}`)
      }

      return this.convertDbHouseToFrontend(data)
    } catch (error) {
      console.error('HouseService.update error:', error)
      throw error
    }
  }

  /**
   * Delete a house
   */
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('houses')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting house:', error)
        throw new Error(`Failed to delete house: ${error.message}`)
      }

      return true
    } catch (error) {
      console.error('HouseService.delete error:', error)
      throw error
    }
  }
}

// Export a singleton instance
export const houseService = new HouseService()
