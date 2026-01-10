import { NextRequest, NextResponse } from 'next/server'
import { ownerService } from 'lib/supabase/services/owners'
import type { OwnerUpdateInput } from 'types/owner'

/**
 * GET /api/owners/[id] - Get a specific owner by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const owner = await ownerService.getById(id)
    
    if (!owner) {
      return NextResponse.json(
        { success: false, error: 'Owner not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: owner })
  } catch (error) {
    console.error('[API] Error fetching owner:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch owner' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/owners/[id] - Update a specific owner
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json() as OwnerUpdateInput
    
    const owner = await ownerService.update(id, body)
    return NextResponse.json({ success: true, data: owner })
  } catch (error) {
    console.error('[API] Error updating owner:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update owner' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/owners/[id] - Delete a specific owner
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await ownerService.delete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error deleting owner:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete owner' },
      { status: 500 }
    )
  }
}

