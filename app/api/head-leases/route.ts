import { NextRequest, NextResponse } from 'next/server'
import { headLeaseService } from 'lib/supabase/services/head-leases'
import type { HeadLeaseCreateInput } from 'types/head-lease'

/**
 * GET /api/head-leases - Get all head leases for the current organization
 * Optional query param: houseId to filter by house
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const houseId = searchParams.get('houseId')
    
    let leases
    if (houseId) {
      leases = await headLeaseService.getByHouseId(houseId)
    } else {
      leases = await headLeaseService.getAll()
    }
    
    return NextResponse.json({ success: true, data: leases })
  } catch (error) {
    console.error('[API] Error fetching head leases:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch head leases' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/head-leases - Create a new head lease
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as HeadLeaseCreateInput
    
    // Validate required fields
    if (!body.houseId || !body.ownerId || !body.startDate || !body.status) {
      return NextResponse.json(
        { success: false, error: 'House ID, owner ID, start date, and status are required' },
        { status: 400 }
      )
    }

    const lease = await headLeaseService.create(body)
    return NextResponse.json({ success: true, data: lease }, { status: 201 })
  } catch (error) {
    console.error('[API] Error creating head lease:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create head lease' },
      { status: 500 }
    )
  }
}

