import { NextRequest, NextResponse } from 'next/server'
import { headLeaseService } from 'lib/supabase/services/head-leases'
import type { HeadLeaseUpdateInput } from 'types/head-lease'

/**
 * GET /api/head-leases/[id] - Get a specific head lease by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const lease = await headLeaseService.getById(id)
    
    if (!lease) {
      return NextResponse.json(
        { success: false, error: 'Head lease not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: lease })
  } catch (error) {
    console.error('[API] Error fetching head lease:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch head lease' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/head-leases/[id] - Update a specific head lease
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json() as HeadLeaseUpdateInput
    
    const lease = await headLeaseService.update(id, body)
    return NextResponse.json({ success: true, data: lease })
  } catch (error) {
    console.error('[API] Error updating head lease:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update head lease' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/head-leases/[id] - Delete a specific head lease
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await headLeaseService.delete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error deleting head lease:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete head lease' },
      { status: 500 }
    )
  }
}

