import { NextRequest, NextResponse } from 'next/server'
import { automationService } from 'lib/supabase/services/automations'
import type { AutomationCreateInput } from 'types/automation'

/** GET /api/automations — list all automations for the org */
export async function GET() {
  try {
    const automations = await automationService.getAll()
    return NextResponse.json({ success: true, data: automations })
  } catch (error: any) {
    console.error('[API] GET /api/automations error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    )
  }
}

/** POST /api/automations — create a new automation */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AutomationCreateInput
    if (!body.name || !body.type || !body.schedule) {
      return NextResponse.json(
        { success: false, error: 'name, type, and schedule are required' },
        { status: 400 },
      )
    }
    const automation = await automationService.create(body)
    return NextResponse.json({ success: true, data: automation }, { status: 201 })
  } catch (error: any) {
    console.error('[API] POST /api/automations error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    )
  }
}

