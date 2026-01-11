import { NextRequest, NextResponse } from 'next/server'
import { houseSupplierService } from 'lib/supabase/services/house-suppliers'
import type { HouseSupplierUpdateInput } from 'types/house-supplier'

/**
 * PUT /api/house-suppliers/[id] - Update a house-supplier link (notes)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json() as HouseSupplierUpdateInput
    
    const link = await houseSupplierService.update(id, body)
    return NextResponse.json({ success: true, data: link })
  } catch (error) {
    console.error('[API] Error updating house-supplier link:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update supplier link' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/house-suppliers/[id] - Remove a supplier link from a house
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await houseSupplierService.delete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error deleting house-supplier link:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove supplier link' },
      { status: 500 }
    )
  }
}

