import { NextRequest, NextResponse } from "next/server"
import { houseCreateSchema } from "lib/schemas/house"
import { HouseService } from "lib/supabase/services/houses"
import { getCurrentUserId, logAction, getRequestMetadata } from "lib/services/audit-logger"

/**
 * GET /api/houses/[id] - Get a specific house by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const houseService = new HouseService()
    const house = await houseService.getById(id)
    
    if (!house) {
      return NextResponse.json(
        { success: false, error: "House not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: house })
  } catch (error) {
    console.error("Error fetching house:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch house" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/houses/[id] - Update a specific house by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { id } = await params
    const houseService = new HouseService()
    
    // Check if house exists
    const existingHouse = await houseService.getById(id)
    if (!existingHouse) {
      return NextResponse.json(
        { success: false, error: "House not found" },
        { status: 404 }
      )
    }

    // If only imageUrl is being updated, handle it as a partial update
    const bodyObj = body as { imageUrl?: string; [key: string]: any }
    if (Object.keys(bodyObj).length === 1 && 'imageUrl' in bodyObj) {
      const updatedHouse = await houseService.update(id, {
        ...existingHouse,
        imageUrl: bodyObj.imageUrl,
        updatedBy: 'system' // TODO: Get from auth context
      })
      return NextResponse.json({ success: true, data: updatedHouse })
    }

    // For full updates, validate the request body
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

    // Get current user ID for logging
    const userId = await getCurrentUserId()

    // Update the house with full validation
    const updatedHouse = await houseService.update(id, {
      ...validation.data,
      // Preserve audit fields
      createdBy: existingHouse.createdBy,
      updatedBy: userId || 'system'
    })

    // Log the action
    if (userId) {
      const metadata = getRequestMetadata(request)
      await logAction({
        userId,
        entityType: 'house',
        entityId: id,
        action: 'update',
        details: {
          changes: validation.data
        },
        ...metadata
      })
    }

    return NextResponse.json({ success: true, data: updatedHouse })
  } catch (error) {
    console.error("Error updating house:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update house" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/houses/[id] - Delete a specific house by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const houseService = new HouseService()
    
    // Check if house exists
    const existingHouse = await houseService.getById(id)
    if (!existingHouse) {
      return NextResponse.json(
        { success: false, error: "House not found" },
        { status: 404 }
      )
    }

    // Get current user ID for logging
    const userId = await getCurrentUserId()

    // Delete the house
    await houseService.delete(id)

    // Log the action
    if (userId) {
      const metadata = getRequestMetadata(request)
      await logAction({
        userId,
        entityType: 'house',
        entityId: id,
        action: 'delete',
        details: {
          address1: existingHouse.address1,
          suburb: existingHouse.suburb,
          state: existingHouse.state,
          descriptor: existingHouse.descriptor
        },
        ...metadata
      })
    }

    return NextResponse.json({ success: true, message: "House deleted successfully" })
  } catch (error) {
    console.error("Error deleting house:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete house" },
      { status: 500 }
    )
  }
}