import { createClient } from '../server'
import type { HouseExpense, HouseExpenseCreateInput, HouseExpenseUpdateInput, ExpenseScope } from '../../../types/house-expense'
import { getCurrentUserOrganizationId } from '../../utils/organization'

/**
 * Service for managing expense operations with Supabase.
 * Supports both property-level and organisation-level expenses.
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
      houseId: row.house_id || null,
      headLeaseId: row.head_lease_id || undefined,
      scope: row.scope || 'property',
      category: row.category,
      description: row.description,
      reference: row.reference || undefined,
      supplier: row.supplier || undefined,
      amount: parseFloat(row.amount),
      frequency: row.frequency || undefined,
      occurredAt: new Date(row.occurred_at),
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
      status: row.status,
      notes: row.notes || undefined,
      documentUrl: row.document_url || undefined,
      isSnapshot: row.is_snapshot ?? false,
      meterReading: row.meter_reading != null ? parseFloat(row.meter_reading) : undefined,
      readingUnit: row.reading_unit ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      houseName: row.houses?.descriptor || row.houses?.address1 || undefined,
    }
  }

  /** Get all expenses for a specific house, ordered by date (default: newest first) */
  async getByHouseId(houseId: string, filters?: { category?: string; sortOrder?: 'asc' | 'desc' }): Promise<HouseExpense[]> {
    const organizationId = await getCurrentUserOrganizationId()
    if (!organizationId) throw new Error('User organization not found')

    const supabase = await this.getSupabase()
    const ascending = (filters?.sortOrder ?? 'desc') === 'asc'
    let query = supabase
      .from('house_expenses')
      .select('*')
      .eq('house_id', houseId)
      .eq('organization_id', organizationId)
      .order('occurred_at', { ascending })

    if (filters?.category) {
      query = query.eq('category', filters.category)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching house expenses:', error)
      throw new Error(`Failed to fetch expenses: ${error.message}`)
    }

    return (data || []).map((row: any) => this.toFrontend(row))
  }

  /** Get a single expense by ID */
  async getById(id: string): Promise<HouseExpense | null> {
    const organizationId = await getCurrentUserOrganizationId()
    if (!organizationId) throw new Error('User organization not found')

    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('house_expenses')
      .select('*, houses(descriptor, address1)')
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

  /** Create a new expense (property or organisation level) */
  async create(input: HouseExpenseCreateInput): Promise<HouseExpense> {
    const organizationId = await getCurrentUserOrganizationId()
    if (!organizationId) throw new Error('User organization not found')

    const scope = input.scope || 'property'

    const supabase = await this.getSupabase()

    const row: Record<string, unknown> = {
      organization_id: organizationId,
      scope,
      house_id: scope === 'property' ? (input.houseId || null) : null,
      head_lease_id: input.headLeaseId || null,
      category: input.category,
      description: input.description,
      reference: input.reference || null,
      supplier: input.supplier || null,
      amount: input.amount,
      frequency: input.frequency || null,
      occurred_at: input.occurredAt,
      due_date: input.dueDate || null,
      status: input.status || 'draft',
      notes: input.notes || null,
      document_url: input.documentUrl || null,
    }

    // Only include snapshot columns when explicitly creating a snapshot
    if (input.isSnapshot) {
      row.is_snapshot = true
      row.meter_reading = input.meterReading ?? null
      row.reading_unit = input.readingUnit || null
    }

    const { data, error } = await supabase
      .from('house_expenses')
      .insert([row])
      .select('*, houses(descriptor, address1)')
      .single()

    if (error) {
      console.error('Error creating expense:', error)
      throw new Error(`Failed to create expense: ${error.message}`)
    }

    return this.toFrontend(data)
  }

  /** Update an existing expense */
  async update(id: string, input: HouseExpenseUpdateInput): Promise<HouseExpense> {
    const organizationId = await getCurrentUserOrganizationId()
    if (!organizationId) throw new Error('User organization not found')

    const updates: any = { updated_at: new Date().toISOString() }
    if (input.scope !== undefined) updates.scope = input.scope
    if (input.houseId !== undefined) updates.house_id = input.houseId || null
    if (input.category !== undefined) updates.category = input.category
    if (input.description !== undefined) updates.description = input.description
    if (input.reference !== undefined) updates.reference = input.reference || null
    if (input.supplier !== undefined) updates.supplier = input.supplier || null
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
      .select('*, houses(descriptor, address1)')
      .single()

    if (error) {
      console.error('Error updating expense:', error)
      throw new Error(`Failed to update expense: ${error.message}`)
    }

    return this.toFrontend(data)
  }

  /** Delete an expense */
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
      console.error('Error deleting expense:', error)
      throw new Error(`Failed to delete expense: ${error.message}`)
    }

    return true
  }

  /** Get all expenses across the organization, with optional filters */
  async getAll(options?: {
    limit?: number
    offset?: number
    scope?: ExpenseScope
    houseId?: string
    category?: string
    search?: string
  }): Promise<{ data: HouseExpense[]; total: number }> {
    const organizationId = await getCurrentUserOrganizationId()
    if (!organizationId) throw new Error('User organization not found')

    const supabase = await this.getSupabase()

    // Build base query for count
    let countQuery = supabase
      .from('house_expenses')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    if (options?.scope) countQuery = countQuery.eq('scope', options.scope)
    if (options?.houseId) countQuery = countQuery.eq('house_id', options.houseId)
    if (options?.category) countQuery = countQuery.eq('category', options.category)
    if (options?.search) countQuery = countQuery.or(`description.ilike.%${options.search}%,reference.ilike.%${options.search}%,supplier.ilike.%${options.search}%`)

    const { count } = await countQuery

    // Build data query
    let query = supabase
      .from('house_expenses')
      .select('*, houses(descriptor, address1, suburb)')
      .eq('organization_id', organizationId)
      .order('occurred_at', { ascending: false })

    if (options?.scope) query = query.eq('scope', options.scope)
    if (options?.houseId) query = query.eq('house_id', options.houseId)
    if (options?.category) query = query.eq('category', options.category)
    if (options?.search) query = query.or(`description.ilike.%${options.search}%,reference.ilike.%${options.search}%,supplier.ilike.%${options.search}%`)
    if (options?.limit) query = query.limit(options.limit)
    if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching all expenses:', error)
      throw new Error(`Failed to fetch expenses: ${error.message}`)
    }

    return {
      data: (data || []).map((row: any) => this.toFrontend(row)),
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
