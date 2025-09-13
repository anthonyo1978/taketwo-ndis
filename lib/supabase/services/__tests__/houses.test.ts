import { describe, it, expect, vi, beforeEach } from 'vitest'
import { houseService } from '../houses'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      order: vi.fn(() => ({
        data: [],
        error: null
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: { id: 'test-id', address1: '123 Test St' },
          error: null
        }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'test-id', address1: 'Updated St' },
            error: null
          }))
        }))
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        error: null
      }))
    }))
  })
})

// Mock the createClient function
vi.mock('../../client', () => ({
  createClient: () => mockSupabase
}))

describe('HouseService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('should return all houses', async () => {
      const mockHouses = [
        { id: '1', address1: '123 Test St', suburb: 'Test City', state: 'NSW', postcode: '2000' },
        { id: '2', address1: '456 Another St', suburb: 'Test City', state: 'NSW', postcode: '2001' }
      ]

      mockSupabase.from().select().order().data = mockHouses

      const result = await houseService.getAll()

      expect(result).toEqual(mockHouses)
      expect(mockSupabase.from).toHaveBeenCalledWith('houses')
    })

    it('should handle errors gracefully', async () => {
      const error = new Error('Database connection failed')
      mockSupabase.from().select().order().error = error

      await expect(houseService.getAll()).rejects.toThrow('Failed to fetch houses: Database connection failed')
    })
  })

  describe('getById', () => {
    it('should return a house by ID', async () => {
      const mockHouse = { id: '1', address1: '123 Test St', suburb: 'Test City', state: 'NSW', postcode: '2000' }
      
      mockSupabase.from().select().eq().single().data = mockHouse

      const result = await houseService.getById('1')

      expect(result).toEqual(mockHouse)
      expect(mockSupabase.from).toHaveBeenCalledWith('houses')
    })

    it('should return null if house not found', async () => {
      mockSupabase.from().select().eq().single().error = { code: 'PGRST116' }

      const result = await houseService.getById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a new house', async () => {
      const newHouse = {
        address1: '123 New St',
        suburb: 'New City',
        state: 'NSW',
        postcode: '2000'
      }

      const createdHouse = { id: 'new-id', ...newHouse }
      mockSupabase.from().insert().select().single().data = createdHouse

      const result = await houseService.create(newHouse)

      expect(result).toEqual(createdHouse)
      expect(mockSupabase.from).toHaveBeenCalledWith('houses')
    })
  })

  describe('update', () => {
    it('should update a house', async () => {
      const updates = { address1: 'Updated St' }
      const updatedHouse = { id: '1', address1: 'Updated St', suburb: 'Test City', state: 'NSW', postcode: '2000' }
      
      mockSupabase.from().update().eq().select().single().data = updatedHouse

      const result = await houseService.update('1', updates)

      expect(result).toEqual(updatedHouse)
      expect(mockSupabase.from).toHaveBeenCalledWith('houses')
    })
  })

  describe('delete', () => {
    it('should delete a house', async () => {
      mockSupabase.from().delete().eq().error = null

      const result = await houseService.delete('1')

      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('houses')
    })
  })
})
