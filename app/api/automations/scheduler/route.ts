import { NextRequest, NextResponse } from 'next/server'
import { executeRunner } from 'lib/services/automation-runners'
import { calculateNextRunAt } from 'lib/supabase/services/automations'
import type { Automation, AutomationSchedule } from 'types/automation'

/**
 * GET /api/automations/scheduler
 *
 * Called by Vercel Cron every minute (or every hour on Hobby plan).
 * Finds all enabled automations whose nextRunAt <= now and executes them.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verify cron secret
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const auth = request.headers.get('authorization')
      if (!auth || auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Use service role to bypass RLS
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const now = new Date().toISOString()

    // Find due automations
    const { data: dueAutomations, error: fetchErr } = await supabase
      .from('automations')
      .select('*')
      .eq('is_enabled', true)
      .lte('next_run_at', now)

    if (fetchErr) {
      console.error('[SCHEDULER] Fetch error:', fetchErr)
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 })
    }

    if (!dueAutomations || dueAutomations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No automations due',
        processed: 0,
        executionTime: Date.now() - startTime,
      })
    }

    console.log(`[SCHEDULER] Found ${dueAutomations.length} due automation(s)`)

    const results: Array<{ automationId: string; name: string; success: boolean; summary: string }> = []

    for (const row of dueAutomations) {
      const automation: Automation = {
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        description: row.description,
        type: row.type,
        isEnabled: row.is_enabled,
        schedule: row.schedule as AutomationSchedule,
        parameters: row.parameters ?? {},
        lastRunAt: row.last_run_at ? new Date(row.last_run_at) : null,
        nextRunAt: row.next_run_at ? new Date(row.next_run_at) : null,
        lastRunStatus: row.last_run_status,
        createdByUserId: row.created_by_user_id,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }

      try {
        // Create run record
        const { data: run } = await supabase
          .from('automation_runs')
          .insert({
            automation_id: automation.id,
            organization_id: automation.organizationId,
            status: 'running',
            started_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        const runId = run?.id || 'unknown'

        // Execute
        const result = await executeRunner(automation, runId, supabase)

        // Update run
        await supabase
          .from('automation_runs')
          .update({
            status: result.success ? 'success' : 'failed',
            finished_at: new Date().toISOString(),
            summary: result.summary,
            metrics: result.metrics,
            error: result.error ? { message: result.error } : null,
          })
          .eq('id', runId)

        // Update automation
        const nextRunAt = calculateNextRunAt(automation.schedule)
        await supabase
          .from('automations')
          .update({
            last_run_at: new Date().toISOString(),
            last_run_status: result.success ? 'success' : 'failed',
            next_run_at: nextRunAt.toISOString(),
          })
          .eq('id', automation.id)

        results.push({
          automationId: automation.id,
          name: automation.name,
          success: result.success,
          summary: result.summary,
        })

        console.log(`[SCHEDULER] ${automation.name}: ${result.success ? '✅' : '❌'} ${result.summary}`)
      } catch (err: any) {
        console.error(`[SCHEDULER] ${automation.name} fatal error:`, err)
        results.push({
          automationId: automation.id,
          name: automation.name,
          success: false,
          summary: err.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      executionTime: Date.now() - startTime,
    })
  } catch (error: any) {
    console.error('[SCHEDULER] Fatal error:', error)
    return NextResponse.json(
      { success: false, error: error.message, executionTime: Date.now() - startTime },
      { status: 500 },
    )
  }
}

