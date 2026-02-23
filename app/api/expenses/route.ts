import { NextRequest, NextResponse } from 'next/server'
import { houseExpenseService } from 'lib/supabase/services/house-expenses'
import type { HouseExpenseCreateInput, ExpenseScope } from 'types/house-expense'

/**
 * GET /api/expenses — List all expenses across the organization
 * Supports pagination and filtering via query params:
 *   ?page=1&pageSize=50
 *   ?scope=property|organisation
 *   ?houseId=xxx
 *   ?category=xxx
 *   ?search=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '100', 10)
    const scope = searchParams.get('scope') as ExpenseScope | null
    const houseId = searchParams.get('houseId') || undefined
    const category = searchParams.get('category') || undefined
    const search = searchParams.get('search') || undefined

    const { data, total } = await houseExpenseService.getAll({
      limit: pageSize,
      offset: (page - 1) * pageSize,
      scope: scope || undefined,
      houseId,
      category,
      search,
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

/**
 * POST /api/expenses — Create a new expense (property or organisation level)
 * This is the unified expense creation endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as HouseExpenseCreateInput

    if (!body.category || !body.description || body.amount == null || !body.occurredAt) {
      return NextResponse.json(
        { success: false, error: 'Category, description, amount, and date are required' },
        { status: 400 }
      )
    }

    const scope = body.scope || 'property'

    if (scope === 'property' && !body.houseId) {
      return NextResponse.json(
        { success: false, error: 'Property expenses must be assigned to a house' },
        { status: 400 }
      )
    }

    const expense = await houseExpenseService.create({
      ...body,
      scope,
      houseId: scope === 'property' ? body.houseId : null,
    })

    return NextResponse.json({ success: true, data: expense }, { status: 201 })
  } catch (error) {
    console.error('[API] Error creating expense:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create expense' },
      { status: 500 }
    )
  }
}
