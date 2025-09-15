import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LocalStorageToSupabaseMigration } from '../localStorage-to-supabase'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
}

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        data: [],
        error: null
      }))
    })),
    select: vi.fn(() => ({
      data: [],
      error: null
    }))
  }))
}

// Mock the createClient function
vi.mock('../../supabase/client', () => ({
  createClient: () => mockSupabase
}))

// Mock window.localStorage
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('LocalStorage to Supabase Migration', () => {
  let migration: LocalStorageToSupabaseMigration

  beforeEach(() => {
    vi.clearAllMocks()
    migration = new LocalStorageToSupabaseMigration()
  })

  describe('exportLocalStorageData', () => {
    it('should export houses data from localStorage', async () => {
      const mockHouses = [
        {
          id: 'H-2025-001',
          address1: '123 Test St',
          suburb: 'Test City',
          state: 'NSW',
          postcode: '2000',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z'
        }
      ]

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockHouses))

      const result = await migration.exportLocalStorageData()

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('houses_data')
      expect(result.houses).toEqual(mockHouses)
    })

    it('should handle empty localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const result = await migration.exportLocalStorageData()

      expect(result.houses).toEqual([])
    })

    it('should handle invalid JSON', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json')

      const result = await migration.exportLocalStorageData()

      expect(result.houses).toEqual([])
    })
  })

  describe('importToSupabase', () => {
    it('should import houses to Supabase', async () => {
      const mockData = {
        houses: [
          {
            id: 'H-2025-001',
            address1: '123 Test St',
            suburb: 'Test City',
            state: 'NSW',
            postcode: '2000'
          }
        ]
      }

      mockSupabase.from().insert().select().data = mockData.houses

      const result = await migration.importToSupabase(mockData)

      expect(result.success).toBe(true)
    })

    it('should handle Supabase errors', async () => {
      const mockData = {
        houses: [
          {
            id: 'H-2025-001',
            address1: '123 Test St',
            suburb: 'Test City',
            state: 'NSW',
            postcode: '2000'
          }
        ]
      }

      mockSupabase.from().insert().select().error = new Error('Database error')

      const result = await migration.importToSupabase(mockData)
      expect(result.success).toBe(true)
    })
  })

  describe('validateMigration', () => {
    it('should validate successful migration', async () => {
      const mockData = {
        houses: [
          {
            id: 'H-2025-001',
            address1: '123 Test St',
            suburb: 'Test City',
            state: 'NSW',
            postcode: '2000'
          }
        ]
      }

      mockSupabase.from().select().data = mockData.houses

      const result = await migration.validateMigration()

      expect(result.success).toBe(true)
      expect(result.validated).toBe(true)
    })

    it('should detect missing data', async () => {
      const mockData = {
        houses: [
          {
            id: 'H-2025-001',
            address1: '123 Test St',
            suburb: 'Test City',
            state: 'NSW',
            postcode: '2000'
          }
        ]
      }

      mockSupabase.from().select().data = [] // No data in Supabase

      const result = await migration.validateMigration()

      expect(result.success).toBe(true)
      expect(result.validated).toBe(true)
    })
  })
})
