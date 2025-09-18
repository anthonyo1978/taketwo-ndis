import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { residentService } from "lib/supabase/services/residents"
import { houseService } from "lib/supabase/services/houses"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// Validation schema for unassignment
const unassignResidentSchema = z.object({
  residentId: z.string().min(1, "Resident ID is required")
})

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: houseId } = await params
    const body = await request.json()

    // Validate request data
    const validation = unassignResidentSchema.safeParse(body)
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

    const { residentId } = validation.data

    // Verify house exists
    const house = await houseService.getById(houseId)
    if (!house) {
      return NextResponse.json(
        { 
          success: false, 
          error: "House not found" 
        },
        { status: 404 }
      )
    }

    // Verify resident exists
    const resident = await residentService.getById(residentId)
    if (!resident) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Resident not found" 
        },
        { status: 404 }
      )
    }

    // Check if resident is actually assigned to this house
    if (resident.houseId !== houseId) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Resident is not assigned to this house" 
        },
        { status: 400 }
      )
    }

    // Unassign resident from house
    const updatedResident = await residentService.update(residentId, { 
      houseId: null 
    })

    return NextResponse.json(
      { 
        success: true, 
        data: updatedResident,
        message: `Resident ${resident.firstName} ${resident.lastName} removed from house successfully`
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Resident unassignment error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error" 
      },
      { status: 500 }
    )
  }
}
