import { createClient } from 'lib/supabase/server'
import { getCurrentUserOrganizationId } from 'lib/utils/organization'
import type {
  Automation,
  AutomationCreateInput,
  AutomationUpdateInput,
  AutomationRun,
  AutomationSchedule,
} from 'types/automation'

/* ───── Row ↔ Frontend mapping ───── */

function toFrontend(row: any): Automation {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description ?? undefined,
    type: row.type,
    isEnabled: row.is_enabled,
    schedule: row.schedule as AutomationSchedule,
    parameters: row.parameters ?? {},
    lastRunAt: row.last_run_at ? new Date(row.last_run_at) : null,
    nextRunAt: row.next_run_at ? new Date(row.next_run_at) : null,
    lastRunStatus: row.last_run_status ?? null,
    createdByUserId: row.created_by_user_id ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function runToFrontend(row: any): AutomationRun {
  return {
    id: row.id,
    automationId: row.automation_id,
    organizationId: row.organization_id,
    startedAt: new Date(row.started_at),
    finishedAt: row.finished_at ? new Date(row.finished_at) : null,
    status: row.status,
    summary: row.summary ?? undefined,
    metrics: row.metrics ?? undefined,
    error: row.error ?? null,
    createdAt: new Date(row.created_at),
  }
}

/* ───── Next-run calculator ───── */

export function calculateNextRunAt(schedule: AutomationSchedule, fromDate?: Date): Date {
  const now = fromDate ?? new Date()
  const parts = (schedule.timeOfDay || '02:00').split(':').map(Number)
  const hours = parts[0] ?? 2
  const minutes = parts[1] ?? 0

  let next: Date

  switch (schedule.frequency) {
    case 'daily': {
      next = new Date(now)
      next.setHours(hours, minutes, 0, 0)
      if (next <= now) next.setDate(next.getDate() + 1)
      break
    }
    case 'weekly': {
      const targetDay = schedule.dayOfWeek ?? 1 // Monday default
      next = new Date(now)
      next.setHours(hours, minutes, 0, 0)
      const currentDay = next.getDay()
      let daysUntil = targetDay - currentDay
      if (daysUntil < 0 || (daysUntil === 0 && next <= now)) {
        daysUntil += 7
      }
      next.setDate(next.getDate() + daysUntil)
      break
    }
    case 'monthly': {
      const targetDOM = schedule.dayOfMonth ?? 1
      next = new Date(now.getFullYear(), now.getMonth(), targetDOM, hours, minutes, 0, 0)
      if (next <= now) {
        next.setMonth(next.getMonth() + 1)
      }
      break
    }
    default: {
      next = new Date(now)
      next.setDate(next.getDate() + 1)
      next.setHours(hours, minutes, 0, 0)
    }
  }

  return next
}

/* ───── Service ───── */

export class AutomationService {
  /** Get all automations for the current org */
  async getAll(): Promise<Automation[]> {
    const supabase = await createClient()
    const orgId = await getCurrentUserOrganizationId()
    if (!orgId) throw new Error('Organisation not found')

    const { data, error } = await supabase
      .from('automations')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map(toFrontend)
  }

  /** Get a single automation by ID */
  async getById(id: string): Promise<Automation | null> {
    const supabase = await createClient()
    const orgId = await getCurrentUserOrganizationId()
    if (!orgId) throw new Error('Organisation not found')

    const { data, error } = await supabase
      .from('automations')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return toFrontend(data)
  }

  /** Create a new automation */
  async create(input: AutomationCreateInput): Promise<Automation> {
    const supabase = await createClient()
    const orgId = await getCurrentUserOrganizationId()
    if (!orgId) throw new Error('Organisation not found')

    const schedule = input.schedule
    const nextRunAt = calculateNextRunAt(schedule)

    const { data, error } = await supabase
      .from('automations')
      .insert({
        organization_id: orgId,
        name: input.name,
        description: input.description || null,
        type: input.type,
        is_enabled: input.isEnabled ?? true,
        schedule: input.schedule,
        parameters: input.parameters ?? {},
        next_run_at: nextRunAt.toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return toFrontend(data)
  }

  /** Update an automation */
  async update(id: string, input: AutomationUpdateInput): Promise<Automation> {
    const supabase = await createClient()
    const orgId = await getCurrentUserOrganizationId()
    if (!orgId) throw new Error('Organisation not found')

    // Build update payload
    const updates: Record<string, any> = {}
    if (input.name !== undefined) updates.name = input.name
    if (input.description !== undefined) updates.description = input.description || null
    if (input.isEnabled !== undefined) updates.is_enabled = input.isEnabled
    if (input.parameters !== undefined) updates.parameters = input.parameters

    // If schedule changed, recalculate nextRunAt
    if (input.schedule) {
      // Merge partial schedule with existing
      const { data: existing } = await supabase
        .from('automations')
        .select('schedule')
        .eq('id', id)
        .single()

      const merged = { ...(existing?.schedule as any || {}), ...input.schedule }
      updates.schedule = merged
      updates.next_run_at = calculateNextRunAt(merged).toISOString()
    }

    const { data, error } = await supabase
      .from('automations')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) throw error
    return toFrontend(data)
  }

  /** Delete an automation */
  async delete(id: string): Promise<void> {
    const supabase = await createClient()
    const orgId = await getCurrentUserOrganizationId()
    if (!orgId) throw new Error('Organisation not found')

    const { error } = await supabase
      .from('automations')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId)

    if (error) throw error
  }

  /** Toggle enabled/disabled */
  async toggleEnabled(id: string, isEnabled: boolean): Promise<Automation> {
    const updates: AutomationUpdateInput = { isEnabled }
    // If re-enabling, recalculate next run
    if (isEnabled) {
      const auto = await this.getById(id)
      if (auto) {
        updates.schedule = auto.schedule
      }
    }
    return this.update(id, updates)
  }

  /* ─── Runs ─── */

  /** Get recent runs for an automation */
  async getRuns(automationId: string, limit = 20): Promise<AutomationRun[]> {
    const supabase = await createClient()
    const orgId = await getCurrentUserOrganizationId()
    if (!orgId) throw new Error('Organisation not found')

    const { data, error } = await supabase
      .from('automation_runs')
      .select('*')
      .eq('automation_id', automationId)
      .eq('organization_id', orgId)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data || []).map(runToFrontend)
  }

  /** Get all recent runs across all automations */
  async getAllRuns(limit = 50): Promise<AutomationRun[]> {
    const supabase = await createClient()
    const orgId = await getCurrentUserOrganizationId()
    if (!orgId) throw new Error('Organisation not found')

    const { data, error } = await supabase
      .from('automation_runs')
      .select('*')
      .eq('organization_id', orgId)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data || []).map(runToFrontend)
  }
}

export const automationService = new AutomationService()

