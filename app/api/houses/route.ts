import { NextRequest, NextResponse } from "next/server"

import { houseCreateSchema } from "lib/schemas/house"
import { houseService } from "lib/supabase/services/houses"

export async function POST(request: NextRequest) {
  try {
    // Add delay to simulate realistic API behavior
    await new Promise((resolve) => setTimeout(resolve, 800))

    const body = await request.json()

    // Validate request data
    const validation = houseCreateSchema.safeParse(body)
    
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

    // Create house in Supabase
    const newHouse = await houseService.create(validation.data)

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
    // Add delay to simulate realistic API behavior
    await new Promise((resolve) => setTimeout(resolve, 300))

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