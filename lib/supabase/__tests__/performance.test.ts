import { describe, it, expect, beforeAll } from 'vitest'
import { houseService } from '../services/houses'

describe('Performance Tests', () => {
  beforeAll(async () => {
    // Set up test data
    const testHouses = Array.from({ length: 100 }, (_, i) => ({
      address1: `${i + 1} Test Street`,
      suburb: 'Test City',
      state: 'NSW',
      postcode: '2000'
    }))

    // Create test houses
    for (const house of testHouses) {
      await houseService.create(house)
    }
  })

  describe('Query Performance', () => {
    it('should fetch all houses within 1 second', async () => {
      const startTime = Date.now()
      
      const houses = await houseService.getAll()
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(1000) // 1 second
      expect(houses.length).toBeGreaterThan(0)
    })

    it('should fetch single house within 500ms', async () => {
      const houses = await houseService.getAll()
      const firstHouse = houses[0]
      
      const startTime = Date.now()
      
      const house = await houseService.getById(firstHouse.id)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(500) // 500ms
      expect(house).toBeDefined()
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent reads', async () => {
      const startTime = Date.now()
      
      const promises = Array.from({ length: 10 }, () => houseService.getAll())
      const results = await Promise.all(promises)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(2000) // 2 seconds for 10 concurrent reads
      expect(results).toHaveLength(10)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(Array.isArray(result)).toBe(true)
      })
    })

    it('should handle concurrent writes', async () => {
      const testHouses = Array.from({ length: 5 }, (_, i) => ({
        address1: `${i + 1} Concurrent St`,
        suburb: 'Concurrent City',
        state: 'NSW',
        postcode: '2000'
      }))

      const startTime = Date.now()
      
      const promises = testHouses.map(house => houseService.create(house))
      const results = await Promise.all(promises)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(3000) // 3 seconds for 5 concurrent writes
      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.id).toBeDefined()
      })
    })
  })

  describe('Memory Usage', () => {
    it('should not cause memory leaks with large datasets', async () => {
      const initialMemory = process.memoryUsage().heapUsed
      
      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        await houseService.getAll()
      }
      
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })
  })
})
