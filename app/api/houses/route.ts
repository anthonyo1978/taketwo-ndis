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

export async function GET() {
  try {
    // Add delay to simulate realistic API behavior
    await new Promise((resolve) => setTimeout(resolve, 300))

    // Get all houses from Supabase
    const houses = await houseService.getAll()

    return NextResponse.json(
      { 
        success: true, 
        data: houses 
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