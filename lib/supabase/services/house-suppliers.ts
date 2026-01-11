import { createClient } from '../server'
import type { 
  HouseSupplier, 
  HouseSupplierWithDetails, 
  HouseSupplierCreateInput, 
  HouseSupplierUpdateInput 
} from '../../../types/house-supplier'
import { getCurrentUserOrganizationId } from '../../utils/organization'

/**
 * Service class for managing house-supplier link operations with Supabase.
 * Handles CRUD operations for linking suppliers to houses.
 */
export class HouseSupplierService {
  private async getSupabase() {
    return await createClient()
  }

  /**
   * Convert database house_supplier (snake_case) to frontend (camelCase)
   */
  private convertDbHouseSupplierToFrontend(dbHouseSupplier: any): HouseSupplier {
    return {
      id: dbHouseSupplier.id,
      organizationId: dbHouseSupplier.organization_id,
      houseId: dbHouseSupplier.house_id,
      supplierId: dbHouseSupplier.supplier_id,
      notes: dbHouseSupplier.notes,
      createdAt: new Date(dbHouseSupplier.created_at),
      updatedAt: new Date(dbHouseSupplier.updated_at)
    }
  }

  /**
   * Convert database house_supplier with supplier details to frontend
   */
  private convertDbHouseSupplierWithDetailsToFrontend(dbRecord: any): HouseSupplierWithDetails {
    return {
      id: dbRecord.id,
      organizationId: dbRecord.organization_id,
      houseId: dbRecord.house_id,
      supplierId: dbRecord.supplier_id,
      notes: dbRecord.notes,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: new Date(dbRecord.updated_at),
      supplier: {
        id: dbRecord.suppliers.id,
        organizationId: dbRecord.suppliers.organization_id,
        name: dbRecord.suppliers.name,
        supplierType: dbRecord.suppliers.supplier_type,
        contactName: dbRecord.suppliers.contact_name,
        phone: dbRecord.suppliers.phone,
        email: dbRecord.suppliers.email,
        notes: dbRecord.suppliers.notes,
        createdAt: new Date(dbRecord.suppliers.created_at),
        updatedAt: new Date(dbRecord.suppliers.updated_at)
      }
    }
  }

  /**
   * Get all suppliers linked to a specific house
   */
  async getByHouseId(houseId: string): Promise<HouseSupplierWithDetails[]> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('house_suppliers')
        .select(`
          *,
          suppliers (*)
        `)
        .eq('house_id', houseId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching house suppliers:', error)
        throw new Error(`Failed to fetch house suppliers: ${error.message}`)
      }

      return (data || []).map(this.convertDbHouseSupplierWithDetailsToFrontend)
    } catch (error) {
      console.error('HouseSupplierService.getByHouseId error:', error)
      throw error
    }
  }

  /**
   * Get all houses linked to a specific supplier
   */
  async getBySupplierId(supplierId: string): Promise<HouseSupplier[]> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('house_suppliers')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching supplier houses:', error)
        throw new Error(`Failed to fetch supplier houses: ${error.message}`)
      }

      return (data || []).map(this.convertDbHouseSupplierToFrontend)
    } catch (error) {
      console.error('HouseSupplierService.getBySupplierId error:', error)
      throw error
    }
  }

  /**
   * Link a supplier to a house
   */
  async create(input: HouseSupplierCreateInput): Promise<HouseSupplier> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const dbHouseSupplier = {
        organization_id: organizationId,
        house_id: input.houseId,
        supplier_id: input.supplierId,
        notes: input.notes
      }

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('house_suppliers')
        .insert([dbHouseSupplier])
        .select()
        .single()

      if (error) {
        console.error('Error creating house-supplier link:', error)
        throw new Error(`Failed to link supplier to house: ${error.message}`)
      }

      return this.convertDbHouseSupplierToFrontend(data)
    } catch (error) {
      console.error('HouseSupplierService.create error:', error)
      throw error
    }
  }

  /**
   * Update a house-supplier link (mainly for notes)
   */
  async update(id: string, input: HouseSupplierUpdateInput): Promise<HouseSupplier> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      }

      if (input.notes !== undefined) dbUpdates.notes = input.notes

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('house_suppliers')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) {
        console.error('Error updating house-supplier link:', error)
        throw new Error(`Failed to update house-supplier link: ${error.message}`)
      }

      return this.convertDbHouseSupplierToFrontend(data)
    } catch (error) {
      console.error('HouseSupplierService.update error:', error)
      throw error
    }
  }

  /**
   * Remove a supplier link from a house
   */
  async delete(id: string): Promise<boolean> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from('house_suppliers')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId)

      if (error) {
        console.error('Error deleting house-supplier link:', error)
        throw new Error(`Failed to remove supplier link: ${error.message}`)
      }

      return true
    } catch (error) {
      console.error('HouseSupplierService.delete error:', error)
      throw error
    }
  }
}

/**
 * Singleton instance of HouseSupplierService
 */
export const houseSupplierService = new HouseSupplierService()

