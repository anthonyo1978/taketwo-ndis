import { NextRequest, NextResponse } from 'next/server'
import { automationService } from 'lib/supabase/services/automations'
import type { AutomationUpdateInput } from 'types/automation'

interface RouteContext {
  params: Promise<{ id: string }>
}

/** GET /api/automations/[id] — get single automation */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const automation = await automationService.getById(id)
    if (!automation) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: automation })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

/** PATCH /api/automations/[id] — update automation */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as AutomationUpdateInput
    const automation = await automationService.update(id, body)
    return NextResponse.json({ success: true, data: automation })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

/** DELETE /api/automations/[id] — delete automation */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    await automationService.delete(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

