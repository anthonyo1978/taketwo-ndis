import { NextRequest, NextResponse } from 'next/server'
import { automationService } from 'lib/supabase/services/automations'

interface RouteContext {
  params: Promise<{ id: string }>
}

/** GET /api/automations/[id]/runs — list recent runs */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const runs = await automationService.getRuns(id, 30)
    return NextResponse.json({ success: true, data: runs })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

