import { NextRequest, NextResponse } from "next/server"

import { houseCreateSchema } from "lib/schemas/house"
import { houseService } from "lib/supabase/services/houses"
import { getCurrentUserId, logAction, getRequestMetadata } from "lib/services/audit-logger"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Debug: Log the incoming data
    console.log('[HOUSE CREATE] Incoming data:', JSON.stringify(body, null, 2))

    // Validate request data
    const validation = houseCreateSchema.safeParse(body)
    
    // Debug: Log validation result
    if (validation.success) {
      console.log('[HOUSE CREATE] Validation successful:', JSON.stringify(validation.data, null, 2))
    } else {
      console.log('[HOUSE CREATE] Validation failed:', validation.error)
    }
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Validation failed", 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    // Get current user ID for logging
    const userId = await getCurrentUserId()

    // Create house in Supabase
    const newHouse = await houseService.create({
      ...validation.data,
      country: validation.data.country || 'Australia', // Default to Australia
      createdBy: userId || 'system',
      updatedBy: userId || 'system'
    })

    // Log the action
    if (userId) {
      const metadata = getRequestMetadata(request)
      await logAction({
        userId,
        entityType: 'house',
        entityId: newHouse.id,
        action: 'create',
        details: {
          address1: newHouse.address1,
          suburb: newHouse.suburb,
          state: newHouse.state,
          descriptor: newHouse.descriptor
        },
        ...metadata
      })
    }

    return NextResponse.json(
      { 
        success: true, 
        data: newHouse 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('House creation error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error" 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Get paginated houses from Supabase
    const result = await houseService.getPaginated({
      page,
      limit,
      search,
      status,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined
    })

    return NextResponse.json(
      { 
        success: true, 
        data: result.houses,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          hasNext: result.hasNext,
          hasPrev: result.hasPrev
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Houses retrieval error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to load houses" 
      },
      { status: 500 }
    )
  }
}