import { createClient } from '../client'
import type { House } from '@/types/house'

export class HouseService {
  private supabase = createClient()

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

      return data || []
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

      return data
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
      const { data, error } = await this.supabase
        .from('houses')
        .insert([house])
        .select()
        .single()

      if (error) {
        console.error('Error creating house:', error)
        throw new Error(`Failed to create house: ${error.message}`)
      }

      return data
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
      const { data, error } = await this.supabase
        .from('houses')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating house:', error)
        throw new Error(`Failed to update house: ${error.message}`)
      }

      return data
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
