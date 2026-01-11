import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { residentService } from "lib/supabase/services/residents"
import { houseService } from "lib/supabase/services/houses"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// Validation schema for assignment
const assignResidentSchema = z.object({
  residentId: z.string().min(1, "Resident ID is required"),
  roomLabel: z.string().max(50, "Room label must be less than 50 characters").optional(),
  moveInDate: z.coerce.date().optional()
})

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: houseId } = await params
    const body = await request.json()

    // Validate request data
    const validation = assignResidentSchema.safeParse(body)
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

    const { residentId, roomLabel, moveInDate } = validation.data

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

    // Check if resident is already assigned to a house
    if (resident.houseId) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Resident is already assigned to a house. Please unassign them first." 
        },
        { status: 400 }
      )
    }

    // Assign resident to house
    const updatedResident = await residentService.update(residentId, { 
      houseId: houseId,
      roomLabel: roomLabel,
      moveInDate: moveInDate 
    })

    return NextResponse.json(
      { 
        success: true, 
        data: updatedResident,
        message: `Resident ${resident.firstName} ${resident.lastName} assigned to house successfully`
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Resident assignment error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error" 
      },
      { status: 500 }
    )
  }
}
