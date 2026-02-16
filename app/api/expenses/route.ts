import { NextRequest, NextResponse } from 'next/server'
import { houseExpenseService } from 'lib/supabase/services/house-expenses'

/**
 * GET /api/expenses — List all house expenses across the organization
 * Supports pagination via ?page=1&pageSize=50
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '100', 10)

    const { data, total } = await houseExpenseService.getAll({
      limit: pageSize,
      offset: (page - 1) * pageSize,
    })

    return NextResponse.json({
      success: true,
      data,
      pagination: { total, page, pageSize },
    })
  } catch (error) {
    console.error('[API] Error fetching all expenses:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

