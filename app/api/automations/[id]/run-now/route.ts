import { NextRequest, NextResponse } from 'next/server'
import { automationService, calculateNextRunAt } from 'lib/supabase/services/automations'
import { executeRunner, preflightCheck } from 'lib/services/automation-runners'
import { getCurrentUserOrganizationId } from 'lib/utils/organization'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/automations/[id]/run-now — preflight check
 * Returns whether the automation can safely run and why/why not.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const orgId = await getCurrentUserOrganizationId()
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 })
    }

    const automation = await automationService.getById(id)
    if (!automation) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    // Use service role client for preflight queries
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const preflight = await preflightCheck(automation, supabase)

    return NextResponse.json({
      success: true,
      data: preflight,
    })
  } catch (error: any) {
    console.error('[API] GET /api/automations/[id]/run-now error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    )
  }
}

/**
 * POST /api/automations/[id]/run-now — execute an automation immediately
 * Runs preflight check first; rejects if conditions aren't met.
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const orgId = await getCurrentUserOrganizationId()
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 })
    }

    const automation = await automationService.getById(id)
    if (!automation) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    // Use service role client for runner execution
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // ── Preflight check ──
    const preflight = await preflightCheck(automation, supabase)
    if (!preflight.canRun) {
      return NextResponse.json(
        {
          success: false,
          error: preflight.reason,
          preflight,
        },
        { status: 422 },
      )
    }

    // ── Create run record ──
    const { data: run, error: runErr } = await supabase
      .from('automation_runs')
      .insert({
        automation_id: id,
        organization_id: orgId,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (runErr || !run) {
      return NextResponse.json(
        { success: false, error: 'Failed to create run record' },
        { status: 500 },
      )
    }

    // ── Execute runner ──
    const result = await executeRunner(automation, run.id, supabase)

    // ── Update run record ──
    await supabase
      .from('automation_runs')
      .update({
        status: result.success ? 'success' : 'failed',
        finished_at: new Date().toISOString(),
        summary: result.summary,
        metrics: result.metrics,
        error: result.error ? { message: result.error } : null,
      })
      .eq('id', run.id)

    // ── Update automation tracking ──
    const nextRunAt = calculateNextRunAt(automation.schedule)
    await supabase
      .from('automations')
      .update({
        last_run_at: new Date().toISOString(),
        last_run_status: result.success ? 'success' : 'failed',
        next_run_at: nextRunAt.toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      data: {
        runId: run.id,
        ...result,
      },
    })
  } catch (error: any) {
    console.error('[API] POST /api/automations/[id]/run-now error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    )
  }
}
