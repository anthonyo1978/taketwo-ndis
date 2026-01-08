import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { getCurrentUserOrganizationId } from 'lib/utils/organization'

/**
 * GET /api/houses/occupancy - Get occupancy data for all houses
 * Returns current occupancy snapshot for each house in the organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get organization context
    const organizationId = await getCurrentUserOrganizationId()
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'User organization not found' },
        { status: 401 }
      )
    }
    
    // Get occupancy for all houses
    const { data: occupancyData, error } = await supabase
      .rpc('get_all_houses_occupancy', {
        p_organization_id: organizationId
      })
    
    if (error) {
      console.error('[HOUSES OCCUPANCY API] Error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch houses occupancy' },
        { status: 500 }
      )
    }
    
    // Convert to a map for easy lookup
    const occupancyMap: Record<string, {
      occupied_bedrooms: number
      total_bedrooms: number
      occupancy_rate: number
    }> = {}
    
    if (occupancyData) {
      occupancyData.forEach((item: any) => {
        occupancyMap[item.house_id] = {
          occupied_bedrooms: item.occupied_bedrooms,
          total_bedrooms: item.total_bedrooms,
          occupancy_rate: item.occupancy_rate
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      data: occupancyMap
    })
    
  } catch (error) {
    console.error('[HOUSES OCCUPANCY API] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

