import { NextRequest, NextResponse } from 'next/server'
import { houseSupplierService } from 'lib/supabase/services/house-suppliers'
import type { HouseSupplierCreateInput } from 'types/house-supplier'

/**
 * GET /api/houses/[id]/suppliers - Get all suppliers linked to a house
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: houseId } = await params
    const suppliers = await houseSupplierService.getByHouseId(houseId)
    return NextResponse.json({ success: true, data: suppliers })
  } catch (error) {
    console.error('[API] Error fetching house suppliers:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch suppliers for this house' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/houses/[id]/suppliers - Link a supplier to a house
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: houseId } = await params
    const body = await request.json() as { supplierId: string; notes?: string }
    
    // Validate required fields
    if (!body.supplierId) {
      return NextResponse.json(
        { success: false, error: 'Supplier ID is required' },
        { status: 400 }
      )
    }

    const input: HouseSupplierCreateInput = {
      houseId,
      supplierId: body.supplierId,
      notes: body.notes
    }

    const link = await houseSupplierService.create(input)
    return NextResponse.json({ success: true, data: link }, { status: 201 })
  } catch (error) {
    console.error('[API] Error linking supplier to house:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to link supplier to house'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

