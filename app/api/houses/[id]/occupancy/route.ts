import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { getCurrentUserOrganizationId } from 'lib/utils/organization'

interface RouteParams {
  id: string
}

/**
 * GET /api/houses/[id]/occupancy - Get occupancy data for a specific house
 * Returns current occupancy snapshot and 12-month history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id: houseId } = await params
    const supabase = await createClient()
    
    // Get organization context
    const organizationId = await getCurrentUserOrganizationId()
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'User organization not found' },
        { status: 401 }
      )
    }
    
    // Get current occupancy
    const { data: currentOccupancy, error: currentError } = await supabase
      .rpc('get_current_house_occupancy', {
        p_house_id: houseId,
        p_organization_id: organizationId
      })
      .single()
    
    if (currentError) {
      console.error('[OCCUPANCY API] Error fetching current occupancy:', currentError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch current occupancy' },
        { status: 500 }
      )
    }
    
    // Get 12-month history
    const { data: history, error: historyError } = await supabase
      .rpc('get_house_occupancy_history', {
        p_house_id: houseId,
        p_organization_id: organizationId
      })
    
    if (historyError) {
      console.error('[OCCUPANCY API] Error fetching occupancy history:', historyError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch occupancy history' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: {
        current: currentOccupancy,
        history: history || []
      }
    })
    
  } catch (error) {
    console.error('[OCCUPANCY API] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

