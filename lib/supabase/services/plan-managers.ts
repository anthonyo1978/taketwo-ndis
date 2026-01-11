import { createClient } from "lib/supabase/client"
import type { PlanManager, PlanManagerCreateInput, PlanManagerUpdateInput } from "types/plan-manager"
import { getCurrentUserOrganizationId } from "./getCurrentUserOrganizationId"

/**
 * Service for managing Plan Managers
 * Reference data only - does not drive automated invoicing or claims
 */
export class PlanManagerService {
  private async getSupabase() {
    return createClient()
  }

  /**
   * Convert database record (snake_case) to frontend format (camelCase)
   */
  private convertDbPlanManagerToFrontend(dbPlanManager: any): PlanManager {
    return {
      id: dbPlanManager.id,
      organizationId: dbPlanManager.provider_id,
      name: dbPlanManager.name,
      email: dbPlanManager.email || undefined,
      phone: dbPlanManager.phone || undefined,
      billingEmail: dbPlanManager.billing_email || undefined,
      notes: dbPlanManager.notes || undefined,
      createdAt: new Date(dbPlanManager.created_at),
      updatedAt: new Date(dbPlanManager.updated_at)
    }
  }

  /**
   * Get all Plan Managers for the current organization
   */
  async getAll(): Promise<PlanManager[]> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      const supabase = await this.getSupabase()
      
      const { data, error } = await supabase
        .from('plan_managers')
        .select('*')
        .eq('provider_id', organizationId)
        .order('name', { ascending: true })
      
      if (error) {
        console.error('Error fetching plan managers:', error)
        throw new Error(`Failed to fetch plan managers: ${error.message}`)
      }

      return (data || []).map(pm => this.convertDbPlanManagerToFrontend(pm))
    } catch (error) {
      console.error('PlanManagerService.getAll error:', error)
      throw error
    }
  }

  /**
   * Get a single Plan Manager by ID
   */
  async getById(id: string): Promise<PlanManager> {
    try {
      const supabase = await this.getSupabase()
      
      const { data, error } = await supabase
        .from('plan_managers')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Plan Manager not found')
        }
        console.error('Error fetching plan manager:', error)
        throw new Error(`Failed to fetch plan manager: ${error.message}`)
      }

      return this.convertDbPlanManagerToFrontend(data)
    } catch (error) {
      console.error('PlanManagerService.getById error:', error)
      throw error
    }
  }

  /**
   * Create a new Plan Manager
   */
  async create(input: PlanManagerCreateInput): Promise<PlanManager> {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      const supabase = await this.getSupabase()
      
      const dbInput = {
        provider_id: organizationId,
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        billing_email: input.billingEmail || null,
        notes: input.notes || null
      }
      
      const { data, error } = await supabase
        .from('plan_managers')
        .insert(dbInput)
        .select()
        .single()
      
      if (error) {
        console.error('Error creating plan manager:', error)
        throw new Error(`Failed to create plan manager: ${error.message}`)
      }

      return this.convertDbPlanManagerToFrontend(data)
    } catch (error) {
      console.error('PlanManagerService.create error:', error)
      throw error
    }
  }

  /**
   * Update an existing Plan Manager
   */
  async update(id: string, updates: PlanManagerUpdateInput): Promise<PlanManager> {
    try {
      const supabase = await this.getSupabase()
      
      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      }
      
      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.email !== undefined) dbUpdates.email = updates.email || null
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null
      if (updates.billingEmail !== undefined) dbUpdates.billing_email = updates.billingEmail || null
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null
      
      const { data, error } = await supabase
        .from('plan_managers')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating plan manager:', error)
        throw new Error(`Failed to update plan manager: ${error.message}`)
      }

      return this.convertDbPlanManagerToFrontend(data)
    } catch (error) {
      console.error('PlanManagerService.update error:', error)
      throw error
    }
  }

  /**
   * Delete a Plan Manager
   * Note: This will set plan_manager_id to NULL for any residents using this PM
   */
  async delete(id: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      
      const { error } = await supabase
        .from('plan_managers')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error('Error deleting plan manager:', error)
        throw new Error(`Failed to delete plan manager: ${error.message}`)
      }

      return true
    } catch (error) {
      console.error('PlanManagerService.delete error:', error)
      throw error
    }
  }
}

// Export singleton instance
export const planManagerService = new PlanManagerService()

