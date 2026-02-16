import { NextRequest, NextResponse } from 'next/server'
import { houseExpenseService } from 'lib/supabase/services/house-expenses'
import type { HouseExpenseUpdateInput } from 'types/house-expense'

/**
 * GET /api/house-expenses/[id] — Get a single expense
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const expense = await houseExpenseService.getById(id)
    if (!expense) {
      return NextResponse.json({ success: false, error: 'Expense not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: expense })
  } catch (error) {
    console.error('[API] Error fetching expense:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch expense' }, { status: 500 })
  }
}

/**
 * PUT /api/house-expenses/[id] — Update an expense
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json() as HouseExpenseUpdateInput
    const expense = await houseExpenseService.update(id, body)
    return NextResponse.json({ success: true, data: expense })
  } catch (error) {
    console.error('[API] Error updating expense:', error)
    return NextResponse.json({ success: false, error: 'Failed to update expense' }, { status: 500 })
  }
}

/**
 * DELETE /api/house-expenses/[id] — Delete an expense
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await houseExpenseService.delete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error deleting expense:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete expense' }, { status: 500 })
  }
}

