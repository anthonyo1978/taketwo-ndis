import { createClient } from '../server'
import type { House } from '../../../types/house'
import { getCurrentUserOrganizationId } from '../../utils/organization'

/**
 * Service class for managing house data operations with Supabase.
 * Handles CRUD operations for houses.
 */
export class HouseService {
  private async getSupabase() {
    return await createClient()
  }

  /**
   * Convert database house (snake_case) to frontend house (camelCase)
   */
  private convertDbHouseToFrontend(dbHouse: any): House {
    return {
      id: dbHouse.id,
      descriptor: dbHouse.descriptor || undefined, // Handle missing descriptor field
      address1: dbHouse.address1,
      unit: dbHouse.unit,
      suburb: dbHouse.suburb,
      state: dbHouse.state,
      postcode: dbHouse.postcode,
      country: dbHouse.country || 'AU', // Default to AU if not provided
      status: dbHouse.status,
      notes: dbHouse.notes,
      goLiveDate: dbHouse.go_live_date, // Convert snake_case to camelCase
      resident: dbHouse.resident,
      imageUrl: dbHouse.image_url || undefined, // Handle missing image_url field
      createdAt: new Date(dbHouse.created_at),
      createdBy: 'system', // Default value since we don't have this in DB yet
      updatedAt: new Date(dbHouse.updated_at),
      updatedBy: 'system' // Default value since we don't have this in DB yet
    }
  }

  /**
   * Get paginated houses from Supabase with search and filtering.
   * 
   * @param options - Pagination and filtering options
   * @returns Promise resolving to paginated houses result
   * @throws Error if database query fails
   */
  async getPaginated(options: {
    page: number
    limit: number
    search?: string
    status?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<{
    houses: House[]
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }> {
    try {
      const supabase = await this.getSupabase()
      const { page, limit, search, status, sortBy, sortOrder } = options
      const offset = (page - 1) * limit

      // Build query
      let query = supabase
        .from('houses')
        .select('*', { count: 'exact' })

      // Add search filter
      if (search) {
        query = query.or(`address1.ilike.%${search}%,suburb.ilike.%${search}%,postcode.ilike.%${search}%`)
      }

      // Add status filter
      if (status) {
        query = query.eq('status', status)
      }

      // Add sorting
      query = query.order(sortBy || 'created_at', { ascending: sortOrder === 'asc' })

      // Add pagination
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching paginated houses:', error)
        throw new Error(`Failed to fetch houses: ${error.message}`)
      }

      const houses = data?.map(house => this.convertDbHouseToFrontend(house)) || []
      const total = count || 0
      const totalPages = Math.ceil(total / limit)

      return {
        houses,
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    } catch (error) {
      console.error('HouseService.getPaginated error:', error)
      throw error
    }
  }

  /**
   * Get all houses from Supabase.
   * 
   * @returns Promise resolving to array of all houses
   * @throws Error if database query fails
   */
  async getAll(): Promise<House[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
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
   * Get a house by ID.
   * 
   * @param id - The house ID to find
   * @returns Promise resolving to house or null if not found
   * @throws Error if database query fails
   */
  async getById(id: string): Promise<House | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
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
   * Create a new house.
   * 
   * @param house - The house data to create
   * @returns Promise resolving to created house
   * @throws Error if creation fails
   */
  async create(house: Omit<House, 'id' | 'createdAt' | 'updatedAt'>): Promise<House> {
    try {
      // Get current user's organization ID
      const organizationId = await getCurrentUserOrganizationId()
      
      if (!organizationId) {
        throw new Error('User organization not found. Please log in again.')
      }
      
      // Convert camelCase to snake_case for database
      const dbHouse = {
        organization_id: organizationId, // Multi-tenancy: Add organization context
        descriptor: house.descriptor, // Now uncommented - database migration applied
        address1: house.address1,
        unit: house.unit,
        suburb: house.suburb,
        state: house.state,
        postcode: house.postcode,
        country: house.country || 'AU', // Default to AU if not provided
        status: house.status,
        notes: house.notes,
        go_live_date: house.goLiveDate, // Convert camelCase to snake_case
        resident: house.resident,
        image_url: house.imageUrl // Add image URL support
      }

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
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
   * Update a house.
   * 
   * @param id - The house ID to update
   * @param updates - The fields to update
   * @returns Promise resolving to updated house
   * @throws Error if update fails
   */
  async update(id: string, updates: Partial<Omit<House, 'id' | 'createdAt' | 'updatedAt'>>): Promise<House> {
    try {
      // Convert camelCase to snake_case for database
      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      }

      if (updates.address1 !== undefined) dbUpdates.address1 = updates.address1
      if (updates.unit !== undefined) dbUpdates.unit = updates.unit
      if (updates.suburb !== undefined) dbUpdates.suburb = updates.suburb
      if (updates.state !== undefined) dbUpdates.state = updates.state
      if (updates.postcode !== undefined) dbUpdates.postcode = updates.postcode
      if (updates.country !== undefined) dbUpdates.country = updates.country
      if (updates.status !== undefined) dbUpdates.status = updates.status
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes
      if (updates.goLiveDate !== undefined) dbUpdates.go_live_date = updates.goLiveDate
      if (updates.resident !== undefined) dbUpdates.resident = updates.resident
      if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl
      if (updates.descriptor !== undefined) dbUpdates.descriptor = updates.descriptor

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
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
   * Delete a house.
   * 
   * @param id - The house ID to delete
   * @returns Promise resolving to true if deleted successfully
   * @throws Error if deletion fails
   */
  async delete(id: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
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

/**
 * Singleton instance of HouseService for use throughout the application.
 */
export const houseService = new HouseService()
