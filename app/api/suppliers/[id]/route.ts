import { NextRequest, NextResponse } from 'next/server'
import { supplierService } from 'lib/supabase/services/suppliers'
import type { SupplierUpdateInput } from 'types/supplier'

/**
 * GET /api/suppliers/[id] - Get a specific supplier by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supplier = await supplierService.getById(id)
    
    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: supplier })
  } catch (error) {
    console.error('[API] Error fetching supplier:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch supplier' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/suppliers/[id] - Update a specific supplier
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json() as SupplierUpdateInput
    
    // Basic email validation if provided
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supplier = await supplierService.update(id, body)
    return NextResponse.json({ success: true, data: supplier })
  } catch (error) {
    console.error('[API] Error updating supplier:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update supplier' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/suppliers/[id] - Delete a specific supplier
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await supplierService.delete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error deleting supplier:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete supplier' },
      { status: 500 }
    )
  }
}

