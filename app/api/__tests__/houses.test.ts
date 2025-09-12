import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST, PUT, DELETE } from '../houses/route'
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
        { id: '1', address1: '123 Test St', suburb: 'Test City', state: 'NSW', postcode: '2000' }
      ]

      vi.mocked(houseService.getAll).mockResolvedValue(mockHouses)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockHouses)
      expect(houseService.getAll).toHaveBeenCalled()
    })

    it('should handle errors', async () => {
      vi.mocked(houseService.getAll).mockRejectedValue(new Error('Database error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch houses')
    })
  })

  describe('POST /api/houses', () => {
    it('should create a new house', async () => {
      const newHouse = {
        address1: '123 New St',
        suburb: 'New City',
        state: 'NSW',
        postcode: '2000'
      }

      const createdHouse = { id: 'new-id', ...newHouse }
      vi.mocked(houseService.create).mockResolvedValue(createdHouse)

      const request = new Request('http://localhost:3000/api/houses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHouse)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(createdHouse)
      expect(houseService.create).toHaveBeenCalledWith(newHouse)
    })
  })
})
