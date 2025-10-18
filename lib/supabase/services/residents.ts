import { createClient } from '../server'
import type { Resident, ResidentCreateInput, ResidentUpdateInput, FundingInformation, EmergencyContact, ResidentPreferences } from 'types/resident'
import { getCurrentUserOrganizationId } from '../../utils/organization'

/**
 * Service class for managing resident data operations with Supabase.
 * Handles CRUD operations for residents and their funding contracts.
 */
export class ResidentService {
  private async getSupabase() {
    return await createClient()
  }

  /**
   * Convert database record (snake_case) to frontend format (camelCase)
   */
  private convertDbResidentToFrontend(dbResident: any): Resident {
    return {
      id: dbResident.id,
      houseId: dbResident.house_id,
      house: undefined, // Will be populated separately if needed
      firstName: dbResident.first_name,
      lastName: dbResident.last_name,
      dateOfBirth: new Date(dbResident.date_of_birth),
      gender: dbResident.gender,
      phone: dbResident.phone || undefined,
      email: dbResident.email || undefined,
      ndisId: dbResident.ndis_id || undefined,
      photoBase64: dbResident.photo_base64 || undefined,
      notes: dbResident.notes || undefined,
      status: dbResident.status === 'Draft' ? 'Prospect' : dbResident.status,
      detailedNotes: dbResident.detailed_notes || undefined,
      preferences: dbResident.preferences || {},
      emergencyContact: dbResident.emergency_contact || undefined,
      fundingInformation: [], // Will be loaded separately
      auditTrail: [], // Will be loaded separately
      createdAt: new Date(dbResident.created_at),
      createdBy: dbResident.created_by,
      updatedAt: new Date(dbResident.updated_at),
      updatedBy: dbResident.updated_by
    }
  }

  /**
   * Convert frontend record (camelCase) to database format (snake_case)
   */
  private convertFrontendResidentToDb(frontendResident: any): any {
    return {
      house_id: frontendResident.houseId || null,
      first_name: frontendResident.firstName,
      last_name: frontendResident.lastName,
      date_of_birth: frontendResident.dateOfBirth,
      gender: frontendResident.gender,
      phone: frontendResident.phone || null,
      email: frontendResident.email || null,
      ndis_id: frontendResident.ndisId || null,
      photo_base64: frontendResident.photoBase64 || null,
      notes: frontendResident.notes || null,
      status: frontendResident.status === 'Prospect' ? 'Draft' : frontendResident.status || 'Draft',
      detailed_notes: frontendResident.detailedNotes || null,
      preferences: frontendResident.preferences || null,
      emergency_contact: frontendResident.emergencyContact || null,
      created_by: frontendResident.createdBy || 'system',
      updated_by: frontendResident.updatedBy || 'system'
    }
  }

  /**
   * Get all residents from the database.
   * 
   * @returns Promise resolving to array of all residents
   * @throws Error if database query fails
   */
  async getAll(): Promise<Resident[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching residents:', error)
        throw new Error(`Failed to fetch residents: ${error.message}`)
      }

      return data.map(resident => this.convertDbResidentToFrontend(resident))
    } catch (error) {
      console.error('ResidentService.getAll error:', error)
      throw error
    }
  }

  /**
   * Get resident by ID.
   * 
   * @param id - The resident ID to find
   * @returns Promise resolving to resident or null if not found
   * @throws Error if database query fails
   */
  async getById(id: string): Promise<Resident | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        console.error('Error fetching resident:', error)
        throw new Error(`Failed to fetch resident: ${error.message}`)
      }

      return this.convertDbResidentToFrontend(data)
    } catch (error) {
      console.error('ResidentService.getById error:', error)
      throw error
    }
  }

  /**
   * Get residents by house ID.
   * 
   * @param houseId - The house ID to filter by
   * @returns Promise resolving to array of residents in the house
   * @throws Error if database query fails
   */
  async getByHouseId(houseId: string): Promise<Resident[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('house_id', houseId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching residents by house:', error)
        throw new Error(`Failed to fetch residents: ${error.message}`)
      }

      return data.map(resident => this.convertDbResidentToFrontend(resident))
    } catch (error) {
      console.error('ResidentService.getByHouseId error:', error)
      throw error
    }
  }

  /**
   * Create new resident.
   * 
   * @param resident - The resident data to create
   * @returns Promise resolving to created resident
   * @throws Error if creation fails
   */
  async create(resident: ResidentCreateInput & { houseId: string | null }): Promise<Resident> {
    try {
      // Get current user's organization ID
      const organizationId = await getCurrentUserOrganizationId()
      
      if (!organizationId) {
        throw new Error('User organization not found. Please log in again.')
      }
      
      const dbResident = this.convertFrontendResidentToDb({
        ...resident,
        createdBy: 'system',
        updatedBy: 'system'
      })

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('residents')
        .insert([{ ...dbResident, organization_id: organizationId }])
        .select()
        .single()

      if (error) {
        console.error('Error creating resident:', error)
        throw new Error(`Failed to create resident: ${error.message}`)
      }

      return this.convertDbResidentToFrontend(data)
    } catch (error) {
      console.error('ResidentService.create error:', error)
      throw error
    }
  }

  /**
   * Update resident.
   * 
   * @param id - The resident ID to update
   * @param updates - The fields to update
   * @returns Promise resolving to updated resident
   * @throws Error if update fails
   */
  async update(id: string, updates: ResidentUpdateInput): Promise<Resident> {
    try {
      // Convert only the fields that are being updated to avoid overwriting existing data
      const dbUpdates: any = {
        updated_by: 'system'
      }

      // Only include fields that are actually being updated
      if (updates.houseId !== undefined) dbUpdates.house_id = updates.houseId
      if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName
      if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null
      if (updates.email !== undefined) dbUpdates.email = updates.email || null
      if (updates.status !== undefined) {
        dbUpdates.status = updates.status === 'Prospect' ? 'Draft' : updates.status
      }
      if (updates.detailedNotes !== undefined) dbUpdates.detailed_notes = updates.detailedNotes || null
      if (updates.preferences !== undefined) dbUpdates.preferences = updates.preferences || null
      if (updates.emergencyContact !== undefined) dbUpdates.emergency_contact = updates.emergencyContact || null

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('residents')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating resident:', error)
        throw new Error(`Failed to update resident: ${error.message}`)
      }

      return this.convertDbResidentToFrontend(data)
    } catch (error) {
      console.error('ResidentService.update error:', error)
      throw error
    }
  }

  /**
   * Delete resident.
   * 
   * @param id - The resident ID to delete
   * @returns Promise resolving to true if deleted successfully
   * @throws Error if deletion fails
   */
  async delete(id: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from('residents')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting resident:', error)
        throw new Error(`Failed to delete resident: ${error.message}`)
      }

      return true
    } catch (error) {
      console.error('ResidentService.delete error:', error)
      throw error
    }
  }

  /**
   * Get funding contracts for a resident.
   * 
   * @param residentId - The resident ID to get contracts for
   * @returns Promise resolving to array of funding contracts
   * @throws Error if database query fails
   */
  async getFundingContracts(residentId: string): Promise<FundingInformation[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('funding_contracts')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching funding contracts:', error)
        throw new Error(`Failed to fetch funding contracts: ${error.message}`)
      }

      return data.map(contract => {
        // Now using proper database columns for automation fields

        return {
          id: contract.id,
          type: contract.type,
          amount: contract.amount,
          startDate: new Date(contract.start_date),
          endDate: contract.end_date ? new Date(contract.end_date) : undefined,
          description: contract.description ? (() => {
            try {
              const parsed = JSON.parse(contract.description) as any
              return parsed.originalDescription || contract.description
            } catch {
              return contract.description
            }
          })() : undefined,
          isActive: contract.is_active,
          createdAt: new Date(contract.created_at),
          updatedAt: new Date(contract.updated_at),
          contractStatus: contract.contract_status,
          originalAmount: contract.original_amount,
          currentBalance: contract.current_balance,
          drawdownRate: contract.drawdown_rate,
          autoDrawdown: contract.auto_drawdown,
          lastDrawdownDate: contract.last_drawdown_date ? new Date(contract.last_drawdown_date) : undefined,
          renewalDate: contract.renewal_date ? new Date(contract.renewal_date) : undefined,
          parentContractId: contract.parent_contract_id || undefined,
          supportItemCode: contract.support_item_code || undefined,
          dailySupportItemCost: contract.daily_support_item_cost || undefined,
          // Automation fields (now using proper database columns)
          autoBillingEnabled: contract.auto_billing_enabled || false,
          automatedDrawdownFrequency: contract.automated_drawdown_frequency || 'fortnightly',
          nextRunDate: contract.next_run_date ? new Date(contract.next_run_date) : undefined,
          firstRunDate: contract.first_run_date ? new Date(contract.first_run_date) : undefined
        }
      })
    } catch (error) {
      console.error('ResidentService.getFundingContracts error:', error)
      throw error
    }
  }

  /**
   * Update funding contract for a resident.
   * 
   * @param contractId - The contract ID to update
   * @param updates - The fields to update
   * @returns Promise resolving to updated contract
   * @throws Error if update fails
   */
  async updateFundingContract(contractId: string, updates: Partial<Omit<FundingInformation, 'id' | 'createdAt' | 'updatedAt'>>): Promise<FundingInformation> {
    try {
      const supabase = await this.getSupabase()
      
      // Convert frontend updates to database format
      const dbUpdates: any = {}
      if (updates.type) dbUpdates.type = updates.type
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount
      if (updates.startDate) dbUpdates.start_date = updates.startDate
      if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate
      if (updates.description !== undefined) dbUpdates.description = updates.description
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive
      if (updates.contractStatus) dbUpdates.contract_status = updates.contractStatus
      if (updates.originalAmount !== undefined) dbUpdates.original_amount = updates.originalAmount
      if (updates.currentBalance !== undefined) dbUpdates.current_balance = updates.currentBalance
      if (updates.drawdownRate) dbUpdates.drawdown_rate = updates.drawdownRate
      if (updates.autoDrawdown !== undefined) dbUpdates.auto_drawdown = updates.autoDrawdown
      if (updates.lastDrawdownDate !== undefined) dbUpdates.last_drawdown_date = updates.lastDrawdownDate
      if (updates.renewalDate !== undefined) dbUpdates.renewal_date = updates.renewalDate
      if (updates.parentContractId !== undefined) dbUpdates.parent_contract_id = updates.parentContractId
      if (updates.supportItemCode !== undefined) dbUpdates.support_item_code = updates.supportItemCode
      if (updates.dailySupportItemCost !== undefined) dbUpdates.daily_support_item_cost = updates.dailySupportItemCost
      // Automation fields (now using proper database columns)
      if (updates.autoBillingEnabled !== undefined) dbUpdates.auto_billing_enabled = updates.autoBillingEnabled
      if (updates.automatedDrawdownFrequency) dbUpdates.automated_drawdown_frequency = updates.automatedDrawdownFrequency
      if (updates.nextRunDate !== undefined) dbUpdates.next_run_date = updates.nextRunDate
      if (updates.firstRunDate !== undefined) dbUpdates.first_run_date = updates.firstRunDate
      // Duration field
      if (updates.durationDays !== undefined) dbUpdates.duration_days = updates.durationDays

      const { data, error } = await supabase
        .from('funding_contracts')
        .update(dbUpdates)
        .eq('id', contractId)
        .select()
        .single()

      if (error) {
        console.error('Error updating funding contract:', error)
        throw new Error(`Failed to update funding contract: ${error.message}`)
      }

      // Now using proper database columns for automation fields

      return {
        id: data.id,
        type: data.type,
        amount: data.amount,
        startDate: new Date(data.start_date),
        endDate: data.end_date ? new Date(data.end_date) : undefined,
        description: data.description || undefined,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        contractStatus: data.contract_status,
        originalAmount: data.original_amount,
        currentBalance: data.current_balance,
        drawdownRate: data.drawdown_rate,
        autoDrawdown: data.auto_drawdown,
        lastDrawdownDate: data.last_drawdown_date ? new Date(data.last_drawdown_date) : undefined,
        renewalDate: data.renewal_date ? new Date(data.renewal_date) : undefined,
        parentContractId: data.parent_contract_id || undefined,
        supportItemCode: data.support_item_code || undefined,
        dailySupportItemCost: data.daily_support_item_cost || undefined,
        // Automation fields (now using proper database columns)
        autoBillingEnabled: data.auto_billing_enabled || false,
        automatedDrawdownFrequency: data.automated_drawdown_frequency || 'fortnightly',
        nextRunDate: data.next_run_date ? new Date(data.next_run_date) : undefined,
        firstRunDate: data.first_run_date ? new Date(data.first_run_date) : undefined,
        // Duration field
        durationDays: data.duration_days || undefined
      }
    } catch (error) {
      console.error('ResidentService.updateFundingContract error:', error)
      throw error
    }
  }

  /**
   * Delete funding contract for a resident.
   * 
   * @param contractId - The contract ID to delete
   * @returns Promise resolving to true if deleted successfully
   * @throws Error if deletion fails
   */
  async deleteFundingContract(contractId: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from('funding_contracts')
        .delete()
        .eq('id', contractId)

      if (error) {
        console.error('Error deleting funding contract:', error)
        throw new Error(`Failed to delete funding contract: ${error.message}`)
      }

      return true
    } catch (error) {
      console.error('ResidentService.deleteFundingContract error:', error)
      throw error
    }
  }

  /**
   * Create funding contract for a resident.
   * 
   * @param residentId - The resident ID to create contract for
   * @param contract - The contract data to create
   * @returns Promise resolving to created contract
   * @throws Error if creation fails
   */
  async createFundingContract(residentId: string, contract: Omit<FundingInformation, 'id' | 'createdAt' | 'updatedAt'>): Promise<FundingInformation> {
    try {
      const dbContract = {
        resident_id: residentId,
        type: contract.type,
        amount: contract.amount,
        start_date: contract.startDate,
        end_date: contract.endDate || null,
        description: contract.description || null,
        is_active: contract.isActive,
        contract_status: contract.contractStatus,
        original_amount: contract.originalAmount,
        current_balance: contract.currentBalance,
        drawdown_rate: contract.drawdownRate,
        auto_drawdown: contract.autoDrawdown,
        last_drawdown_date: contract.lastDrawdownDate || null,
        renewal_date: contract.renewalDate || null,
        parent_contract_id: contract.parentContractId || null,
        support_item_code: contract.supportItemCode || null,
        daily_support_item_cost: contract.dailySupportItemCost || null,
        // Automation fields (now using proper database columns)
        auto_billing_enabled: contract.autoBillingEnabled || false,
        automated_drawdown_frequency: contract.automatedDrawdownFrequency || 'fortnightly',
        next_run_date: contract.nextRunDate || null,
        first_run_date: contract.firstRunDate || null,
        // Duration field
        duration_days: contract.durationDays || null
      }

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('funding_contracts')
        .insert([dbContract])
        .select()
        .single()

      if (error) {
        console.error('Error creating funding contract:', error)
        throw new Error(`Failed to create funding contract: ${error.message}`)
      }

      return {
        id: data.id,
        type: data.type,
        amount: data.amount,
        startDate: new Date(data.start_date),
        endDate: data.end_date ? new Date(data.end_date) : undefined,
        description: data.description || undefined,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        contractStatus: data.contract_status,
        originalAmount: data.original_amount,
        currentBalance: data.current_balance,
        drawdownRate: data.drawdown_rate,
        autoDrawdown: data.auto_drawdown,
        lastDrawdownDate: data.last_drawdown_date ? new Date(data.last_drawdown_date) : undefined,
        renewalDate: data.renewal_date ? new Date(data.renewal_date) : undefined,
        parentContractId: data.parent_contract_id || undefined,
        supportItemCode: data.support_item_code || undefined,
        dailySupportItemCost: data.daily_support_item_cost || undefined,
        // Automation fields (now using proper database columns)
        autoBillingEnabled: data.auto_billing_enabled || false,
        automatedDrawdownFrequency: data.automated_drawdown_frequency || 'fortnightly',
        nextRunDate: data.next_run_date ? new Date(data.next_run_date) : undefined,
        firstRunDate: data.first_run_date ? new Date(data.first_run_date) : undefined,
        // Duration field
        durationDays: data.duration_days || undefined
      }
    } catch (error) {
      console.error('ResidentService.createFundingContract error:', error)
      throw error
    }
  }
}

/**
 * Singleton instance of ResidentService for use throughout the application.
 */
export const residentService = new ResidentService()
