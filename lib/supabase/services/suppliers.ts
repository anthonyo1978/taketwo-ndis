import { createClient } from '../server'
import type { Supplier, SupplierCreateInput, SupplierUpdateInput } from '../../../types/supplier'
import { getCurrentUserOrganizationId } from '../../utils/organization'

/**
 * Service class for managing supplier data operations with Supabase.
 * Handles CRUD operations for maintenance and service providers.
 */
export class SupplierService {
  private async getSupabase() {
    return await createClient()
  }

  /**
   * Convert database supplier (snake_case) to frontend supplier (camelCase)
   */
  private convertDbSupplierToFrontend(dbSupplier: any): Supplier {
    return {
      id: dbSupplier.id,
      organizationId: dbSupplier.organization_id,
      name: dbSupplier.name,
      supplierType: dbSupplier.supplier_type,
      contactName: dbSupplier.contact_name,
      phone: dbSupplier.phone,
      email: dbSupplier.email,
      notes: dbSupplier.notes,
      createdAt: new Date(dbSupplier.created_at),
      updatedAt: new Date(dbSupplier.updated_at)
    }
  }

  /**
   * Get all suppliers for the current organization
   */
  async getAll(): Promise<Supplier[]> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching suppliers:', error)
        throw new Error(`Failed to fetch suppliers: ${error.message}`)
      }

      return (data || []).map(this.convertDbSupplierToFrontend)
    } catch (error) {
      console.error('SupplierService.getAll error:', error)
      throw error
    }
  }

  /**
   * Get a single supplier by ID
   */
  async getById(id: string): Promise<Supplier | null> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        console.error('Error fetching supplier:', error)
        throw new Error(`Failed to fetch supplier: ${error.message}`)
      }

      return this.convertDbSupplierToFrontend(data)
    } catch (error) {
      console.error('SupplierService.getById error:', error)
      throw error
    }
  }

  /**
   * Create a new supplier
   */
  async create(input: SupplierCreateInput): Promise<Supplier> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const dbSupplier = {
        organization_id: organizationId,
        name: input.name,
        supplier_type: input.supplierType,
        contact_name: input.contactName,
        phone: input.phone,
        email: input.email,
        notes: input.notes
      }

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('suppliers')
        .insert([dbSupplier])
        .select()
        .single()

      if (error) {
        console.error('Error creating supplier:', error)
        throw new Error(`Failed to create supplier: ${error.message}`)
      }

      return this.convertDbSupplierToFrontend(data)
    } catch (error) {
      console.error('SupplierService.create error:', error)
      throw error
    }
  }

  /**
   * Update an existing supplier
   */
  async update(id: string, input: SupplierUpdateInput): Promise<Supplier> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      }

      if (input.name !== undefined) dbUpdates.name = input.name
      if (input.supplierType !== undefined) dbUpdates.supplier_type = input.supplierType
      if (input.contactName !== undefined) dbUpdates.contact_name = input.contactName
      if (input.phone !== undefined) dbUpdates.phone = input.phone
      if (input.email !== undefined) dbUpdates.email = input.email
      if (input.notes !== undefined) dbUpdates.notes = input.notes

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('suppliers')
        .update(dbUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) {
        console.error('Error updating supplier:', error)
        throw new Error(`Failed to update supplier: ${error.message}`)
      }

      return this.convertDbSupplierToFrontend(data)
    } catch (error) {
      console.error('SupplierService.update error:', error)
      throw error
    }
  }

  /**
   * Delete a supplier
   */
  async delete(id: string): Promise<boolean> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        throw new Error('User organization not found')
      }

      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId)

      if (error) {
        console.error('Error deleting supplier:', error)
        throw new Error(`Failed to delete supplier: ${error.message}`)
      }

      return true
    } catch (error) {
      console.error('SupplierService.delete error:', error)
      throw error
    }
  }
}

/**
 * Singleton instance of SupplierService
 */
export const supplierService = new SupplierService()

