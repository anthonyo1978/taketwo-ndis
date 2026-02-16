import { NextRequest, NextResponse } from 'next/server'
import { houseExpenseService } from 'lib/supabase/services/house-expenses'
import type { HouseExpenseCreateInput } from 'types/house-expense'

/**
 * GET /api/houses/[id]/expenses — List all expenses for a house
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined
    const sortOrder = (searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'
    const expenses = await houseExpenseService.getByHouseId(id, { category, sortOrder })
    return NextResponse.json({ success: true, data: expenses })
  } catch (error) {
    console.error('[API] Error fetching house expenses:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/houses/[id]/expenses — Create a new expense for a house
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json() as Omit<HouseExpenseCreateInput, 'houseId'>

    if (!body.category || !body.description || body.amount == null || !body.occurredAt) {
      return NextResponse.json(
        { success: false, error: 'Category, description, amount, and date are required' },
        { status: 400 }
      )
    }

    const expense = await houseExpenseService.create({
      ...body,
      houseId: id,
    })

    return NextResponse.json({ success: true, data: expense }, { status: 201 })
  } catch (error) {
    console.error('[API] Error creating house expense:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create expense' },
      { status: 500 }
    )
  }
}

