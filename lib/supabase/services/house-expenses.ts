import { createClient } from '../server'
import type { HouseExpense, HouseExpenseCreateInput, HouseExpenseUpdateInput } from '../../../types/house-expense'
import { getCurrentUserOrganizationId } from '../../utils/organization'

/**
 * Service for managing house expense (outgoing) operations with Supabase.
 */
export class HouseExpenseService {
  private async getSupabase() {
    return await createClient()
  }

  /** Convert DB row (snake_case) to frontend type (camelCase) */
  private toFrontend(row: any): HouseExpense {
    return {
      id: row.id,
      organizationId: row.organization_id,
      houseId: row.house_id,
      headLeaseId: row.head_lease_id || undefined,
      category: row.category,
      description: row.description,
      reference: row.reference || undefined,
      amount: parseFloat(row.amount),
      frequency: row.frequency || undefined,
      occurredAt: new Date(row.occurred_at),
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
      status: row.status,
      notes: row.notes || undefined,
      documentUrl: row.document_url || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    }
  }

  /** Get all expenses for a specific house, ordered by most recent first */
  async getByHouseId(houseId: string, filters?: { category?: string }): Promise<HouseExpense[]> {
    const organizationId = await getCurrentUserOrganizationId()
    if (!organizationId) throw new Error('User organization not found')

    const supabase = await this.getSupabase()
    let query = supabase
      .from('house_expenses')
      .select('*')
      .eq('house_id', houseId)
      .eq('organization_id', organizationId)
      .order('occurred_at', { ascending: false })

    if (filters?.category) {
      query = query.eq('category', filters.category)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching house expenses:', error)
      throw new Error(`Failed to fetch expenses: ${error.message}`)
    }

    return (data || []).map(this.toFrontend)
  }

  /** Get a single expense by ID */
  async getById(id: string): Promise<HouseExpense | null> {
    const organizationId = await getCurrentUserOrganizationId()
    if (!organizationId) throw new Error('User organization not found')

    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('house_expenses')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error fetching house expense:', error)
      throw new Error(`Failed to fetch expense: ${error.message}`)
    }

    return this.toFrontend(data)
  }

  /** Create a new house expense */
  async create(input: HouseExpenseCreateInput): Promise<HouseExpense> {
    const organizationId = await getCurrentUserOrganizationId()
    if (!organizationId) throw new Error('User organization not found')

    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('house_expenses')
      .insert([{
        organization_id: organizationId,
        house_id: input.houseId,
        head_lease_id: input.headLeaseId || null,
        category: input.category,
        description: input.description,
        reference: input.reference || null,
        amount: input.amount,
        frequency: input.frequency || null,
        occurred_at: input.occurredAt,
        due_date: input.dueDate || null,
        status: input.status || 'draft',
        notes: input.notes || null,
        document_url: input.documentUrl || null,
      }])
      .select('*')
      .single()

    if (error) {
      console.error('Error creating house expense:', error)
      throw new Error(`Failed to create expense: ${error.message}`)
    }

    return this.toFrontend(data)
  }

  /** Update an existing house expense */
  async update(id: string, input: HouseExpenseUpdateInput): Promise<HouseExpense> {
    const organizationId = await getCurrentUserOrganizationId()
    if (!organizationId) throw new Error('User organization not found')

    const updates: any = { updated_at: new Date().toISOString() }
    if (input.category !== undefined) updates.category = input.category
    if (input.description !== undefined) updates.description = input.description
    if (input.reference !== undefined) updates.reference = input.reference || null
    if (input.amount !== undefined) updates.amount = input.amount
    if (input.frequency !== undefined) updates.frequency = input.frequency || null
    if (input.occurredAt !== undefined) updates.occurred_at = input.occurredAt
    if (input.dueDate !== undefined) updates.due_date = input.dueDate || null
    if (input.paidAt !== undefined) updates.paid_at = input.paidAt || null
    if (input.status !== undefined) updates.status = input.status
    if (input.notes !== undefined) updates.notes = input.notes || null
    if (input.documentUrl !== undefined) updates.document_url = input.documentUrl || null

    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('house_expenses')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating house expense:', error)
      throw new Error(`Failed to update expense: ${error.message}`)
    }

    return this.toFrontend(data)
  }

  /** Delete a house expense */
  async delete(id: string): Promise<boolean> {
    const organizationId = await getCurrentUserOrganizationId()
    if (!organizationId) throw new Error('User organization not found')

    const supabase = await this.getSupabase()
    const { error } = await supabase
      .from('house_expenses')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error deleting house expense:', error)
      throw new Error(`Failed to delete expense: ${error.message}`)
    }

    return true
  }

  /** Get all expenses across the organization, ordered by most recent first */
  async getAll(options?: { limit?: number; offset?: number }): Promise<{ data: HouseExpense[]; total: number }> {
    const organizationId = await getCurrentUserOrganizationId()
    if (!organizationId) throw new Error('User organization not found')

    const supabase = await this.getSupabase()

    // Get total count
    const { count } = await supabase
      .from('house_expenses')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    // Get data
    let query = supabase
      .from('house_expenses')
      .select('*, houses(descriptor, address1, suburb)')
      .eq('organization_id', organizationId)
      .order('occurred_at', { ascending: false })

    if (options?.limit) query = query.limit(options.limit)
    if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching all expenses:', error)
      throw new Error(`Failed to fetch expenses: ${error.message}`)
    }

    return {
      data: (data || []).map((row: any) => ({
        ...this.toFrontend(row),
        houseName: row.houses?.descriptor || row.houses?.address1 || 'Unknown',
      })),
      total: count || 0,
    }
  }

  /** Get summary totals for a house (for balance sheet view) */
  async getSummaryByHouseId(houseId: string): Promise<{ totalExpenses: number; byCategory: Record<string, number>; byStatus: Record<string, number> }> {
    const expenses = await this.getByHouseId(houseId)

    const totalExpenses = expenses
      .filter(e => e.status !== 'cancelled')
      .reduce((sum, e) => sum + e.amount, 0)

    const byCategory: Record<string, number> = {}
    const byStatus: Record<string, number> = {}

    for (const e of expenses) {
      if (e.status === 'cancelled') continue
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
      byStatus[e.status] = (byStatus[e.status] || 0) + e.amount
    }

    return { totalExpenses, byCategory, byStatus }
  }
}

export const houseExpenseService = new HouseExpenseService()

