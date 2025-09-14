import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '../houses/route'
import { GET as GET_BY_ID } from '../houses/[id]/route'
import { houseService } from '@/lib/supabase/services/houses'

// Mock the house service
vi.mock('@/lib/supabase/services/houses', () => ({
  houseService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}))

describe('Houses API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/houses', () => {
    it('should return all houses', async () => {
      const mockHouses = [
        { 
          id: '1', 
          address1: '123 Test St', 
          suburb: 'Test City', 
          state: 'NSW', 
          postcode: '2000',
          country: 'AU',
          status: 'Active',
          goLiveDate: '2024-01-01T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          createdBy: 'admin',
          updatedAt: '2024-01-01T00:00:00.000Z',
          updatedBy: 'admin'
        }
      ]

      vi.mocked(houseService.getAll).mockResolvedValue(mockHouses)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true, data: mockHouses })
      expect(houseService.getAll).toHaveBeenCalled()
    })

    it('should return empty array when no houses exist', async () => {
      vi.mocked(houseService.getAll).mockResolvedValue([])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true, data: [] })
      expect(houseService.getAll).toHaveBeenCalled()
    })

    it('should handle large number of houses (200+)', async () => {
      const mockHouses = Array.from({ length: 200 }, (_, i) => ({
        id: `house-${i}`,
        address1: `123 Test St ${i}`,
        suburb: 'Test City',
        state: 'NSW',
        postcode: '2000',
        country: 'AU',
        status: 'Active',
        goLiveDate: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        createdBy: 'admin',
        updatedAt: '2024-01-01T00:00:00.000Z',
        updatedBy: 'admin'
      }))

      vi.mocked(houseService.getAll).mockResolvedValue(mockHouses)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(200)
      expect(data.success).toBe(true)
    })

    it('should handle houses with long names and special characters', async () => {
      const mockHouses = [{
        id: 'house-1',
        address1: '123 Very Long Street Name That Exceeds Normal Length Limits',
        suburb: 'A Suburb With Very Long Name That Might Cause Issues',
        state: 'NSW',
        postcode: '2000',
        country: 'AU',
        status: 'Active',
        goLiveDate: '2024-01-01T00:00:00.000Z',
        unit: 'Unit 123A/B/C/D/E/F/G/H/I/J/K/L/M/N/O/P/Q/R/S/T/U/V/W/X/Y/Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        createdBy: 'admin',
        updatedAt: '2024-01-01T00:00:00.000Z',
        updatedBy: 'admin'
      }]

      vi.mocked(houseService.getAll).mockResolvedValue(mockHouses)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data[0].address1).toContain('Very Long Street Name')
      expect(data.data[0].unit).toContain('Unit 123A/B/C')
    })

    it('should handle database connection errors', async () => {
      vi.mocked(houseService.getAll).mockRejectedValue(new Error('Connection timeout'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to load houses')
      expect(data.success).toBe(false)
    })

    it('should handle unexpected errors', async () => {
      vi.mocked(houseService.getAll).mockRejectedValue(new Error('Unexpected error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to load houses')
    })
  })

  describe('POST /api/houses', () => {
    const validHouseData = {
      address1: '123 New St',
      suburb: 'New City',
      state: 'NSW',
      postcode: '2000',
      country: 'AU',
      status: 'Active',
      goLiveDate: new Date('2024-01-01')
    }

    it('should create a new house with valid data', async () => {
      const createdHouse = { 
        id: 'new-id', 
        ...validHouseData,
        goLiveDate: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        createdBy: 'admin',
        updatedAt: '2024-01-01T00:00:00.000Z',
        updatedBy: 'admin'
      }
      vi.mocked(houseService.create).mockResolvedValue(createdHouse)

      const request = new Request('http://localhost:3000/api/houses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validHouseData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual({ success: true, data: createdHouse })
      expect(houseService.create).toHaveBeenCalledWith(validHouseData)
    })

    it('should handle validation errors for missing required fields', async () => {
      const invalidHouse = { address1: '' } // Missing required fields

      const request = new Request('http://localhost:3000/api/houses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidHouse)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toBeDefined()
    })

    it('should handle validation errors for invalid data types', async () => {
      const invalidHouse = {
        address1: '123 Test St',
        suburb: 'Test City',
        state: 'NSW',
        postcode: 'invalid-postcode', // Should be numeric
        country: 'AU',
        status: 'InvalidStatus', // Invalid enum value
        goLiveDate: 'invalid-date' // Invalid date format
      }

      const request = new Request('http://localhost:3000/api/houses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidHouse)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Validation failed')
    })

    it('should handle database creation errors', async () => {
      vi.mocked(houseService.create).mockRejectedValue(new Error('Database constraint violation'))

      const request = new Request('http://localhost:3000/api/houses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validHouseData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle malformed JSON', async () => {
      const request = new Request('http://localhost:3000/api/houses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle missing Content-Type header', async () => {
      const request = new Request('http://localhost:3000/api/houses', {
        method: 'POST',
        body: JSON.stringify(validHouseData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('GET /api/houses/[id]', () => {
    const mockHouse = {
      id: 'house-123',
      address1: '123 Test St',
      suburb: 'Test City',
      state: 'NSW',
      postcode: '2000',
      country: 'AU',
      status: 'Active',
      goLiveDate: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      createdBy: 'admin',
      updatedAt: '2024-01-01T00:00:00.000Z',
      updatedBy: 'admin'
    }

    it('should return a house by ID', async () => {
      vi.mocked(houseService.getById).mockResolvedValue(mockHouse)

      const response = await GET_BY_ID(
        new Request('http://localhost:3000/api/houses/house-123'),
        { params: { id: 'house-123' } }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true, data: mockHouse })
      expect(houseService.getById).toHaveBeenCalledWith('house-123')
    })

    it('should return 404 when house not found', async () => {
      vi.mocked(houseService.getById).mockResolvedValue(null)

      const response = await GET_BY_ID(
        new Request('http://localhost:3000/api/houses/nonexistent'),
        { params: { id: 'nonexistent' } }
      )
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toEqual({ success: false, error: 'House not found' })
    })

    it('should return 400 when ID is missing', async () => {
      const response = await GET_BY_ID(
        new Request('http://localhost:3000/api/houses/'),
        { params: { id: '' } }
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ success: false, error: 'House ID is required' })
    })

    it('should handle database errors when fetching by ID', async () => {
      vi.mocked(houseService.getById).mockRejectedValue(new Error('Database error'))

      const response = await GET_BY_ID(
        new Request('http://localhost:3000/api/houses/house-123'),
        { params: { id: 'house-123' } }
      )
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ success: false, error: 'Internal server error' })
    })

    it('should handle special characters in house ID', async () => {
      const specialId = 'house-123-special-chars-!@#$%'
      vi.mocked(houseService.getById).mockResolvedValue(mockHouse)

      const response = await GET_BY_ID(
        new Request(`http://localhost:3000/api/houses/${specialId}`),
        { params: { id: specialId } }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(houseService.getById).toHaveBeenCalledWith(specialId)
    })
  })
})
