import { NextRequest, NextResponse } from 'next/server'
import { ownerService } from 'lib/supabase/services/owners'
import type { OwnerCreateInput } from 'types/owner'

/**
 * GET /api/owners - Get all owners for the current organization
 */
export async function GET(request: NextRequest) {
  try {
    const owners = await ownerService.getAll()
    return NextResponse.json({ success: true, data: owners })
  } catch (error) {
    console.error('[API] Error fetching owners:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch owners' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/owners - Create a new owner
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as OwnerCreateInput
    
    // Validate required fields
    if (!body.name || !body.ownerType) {
      return NextResponse.json(
        { success: false, error: 'Name and owner type are required' },
        { status: 400 }
      )
    }

    const owner = await ownerService.create(body)
    return NextResponse.json({ success: true, data: owner }, { status: 201 })
  } catch (error) {
    console.error('[API] Error creating owner:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create owner' },
      { status: 500 }
    )
  }
}

