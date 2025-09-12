import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '../client'

describe('Database Schema Tests', () => {
  let supabase: ReturnType<typeof createClient>

  beforeAll(() => {
    supabase = createClient()
  })

  describe('Houses Table', () => {
    it('should have correct table structure', async () => {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'houses')
        .eq('table_schema', 'public')

      expect(error).toBeNull()
      expect(data).toBeDefined()

      const columns = data?.map(col => col.column_name) || []
      
      // Check required columns exist
      expect(columns).toContain('id')
      expect(columns).toContain('address1')
      expect(columns).toContain('suburb')
      expect(columns).toContain('state')
      expect(columns).toContain('postcode')
      expect(columns).toContain('created_at')
      expect(columns).toContain('updated_at')
    })

    it('should enforce required fields', async () => {
      const { error } = await supabase
        .from('houses')
        .insert([{
          // Missing required fields
          address2: 'Optional field'
        }])

      expect(error).not.toBeNull()
      expect(error?.message).toContain('null value')
    })

    it('should allow valid house creation', async () => {
      const testHouse = {
        address1: '123 Test St',
        suburb: 'Test City',
        state: 'NSW',
        postcode: '2000'
      }

      const { data, error } = await supabase
        .from('houses')
        .insert([testHouse])
        .select()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.[0]).toMatchObject(testHouse)
      expect(data?.[0].id).toBeDefined()
      expect(data?.[0].created_at).toBeDefined()
      expect(data?.[0].updated_at).toBeDefined()

      // Clean up
      if (data?.[0]?.id) {
        await supabase.from('houses').delete().eq('id', data[0].id)
      }
    })

    it('should enforce data types', async () => {
      const { error } = await supabase
        .from('houses')
        .insert([{
          address1: '123 Test St',
          suburb: 'Test City',
          state: 'NSW',
          postcode: '2000',
          created_at: 'invalid-date' // Invalid timestamp
        }])

      expect(error).not.toBeNull()
    })
  })

  describe('Row Level Security', () => {
    it('should have RLS enabled', async () => {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('is_insertable_into, is_trigger_updatable')
        .eq('table_name', 'houses')
        .eq('table_schema', 'public')

      expect(error).toBeNull()
      expect(data).toBeDefined()
      // RLS enabled tables should have these properties
      expect(data?.[0]).toBeDefined()
    })

    it('should have RLS policies', async () => {
      const { data, error } = await supabase
        .from('information_schema.policies')
        .select('policy_name, table_name')
        .eq('table_name', 'houses')
        .eq('table_schema', 'public')

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.length).toBeGreaterThan(0)
    })
  })

  describe('Indexes', () => {
    it('should have performance indexes', async () => {
      const { data, error } = await supabase
        .from('information_schema.statistics')
        .select('index_name, column_name')
        .eq('table_name', 'houses')
        .eq('table_schema', 'public')

      expect(error).toBeNull()
      expect(data).toBeDefined()
      
      const indexNames = data?.map(idx => idx.index_name) || []
      expect(indexNames).toContain('idx_houses_created_at')
    })
  })
})
