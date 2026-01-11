import { NextRequest, NextResponse } from "next/server"
import { utilitySnapshotService } from "lib/supabase/services/utility-snapshots"
import { utilitySnapshotCreateSchema } from "lib/schemas/utility-snapshot"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/houses/[id]/utility-snapshots
// Fetch all utility snapshots for a property
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: propertyId } = await params
    const { searchParams } = new URL(request.url)
    const utilityType = searchParams.get('utilityType') || undefined
    
    const snapshots = await utilitySnapshotService.getByPropertyId(propertyId, utilityType)
    
    return NextResponse.json(
      { 
        success: true, 
        data: snapshots 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get utility snapshots error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to fetch utility snapshots" 
      },
      { status: 500 }
    )
  }
}

// POST /api/houses/[id]/utility-snapshots
// Create a new utility snapshot
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: propertyId } = await params
    const body = await request.json()
    
    // Add propertyId from URL to body
    const dataWithPropertyId = {
      ...body,
      propertyId
    }
    
    // Validate request data
    const validation = utilitySnapshotCreateSchema.safeParse(dataWithPropertyId)
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
    
    const snapshot = await utilitySnapshotService.create(validation.data)
    
    return NextResponse.json(
      { 
        success: true, 
        data: snapshot,
        message: "Utility snapshot created successfully"
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create utility snapshot error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to create utility snapshot" 
      },
      { status: 500 }
    )
  }
}

