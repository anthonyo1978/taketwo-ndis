import { NextRequest, NextResponse } from 'next/server'
import { residentUpdateSchema, statusTransitionSchema } from 'lib/schemas/resident'
import { residentService } from 'lib/supabase/services/residents'
import type { ResidentStatus, ResidentUpdateInput } from 'types/resident'

interface RouteParams {
  id: string
}

// GET /api/residents/[id] - Get specific resident with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params
    
    // Simulate realistic delay for loading states
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const resident = await residentService.getById(id)
    
    if (!resident) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Resident not found' 
        }, 
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: resident
    })
  } catch (error) {
    console.error('Error fetching resident:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      }, 
      { status: 500 }
    )
  }
}

// PUT /api/residents/[id] - Update resident information
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Check if this is a status change request
    const bodyObj = body as { status?: string; [key: string]: any }
    if (bodyObj.status && Object.keys(bodyObj).length === 1) {
      // Handle status transition separately for proper validation
      const currentResident = await residentService.getById(id)
      if (!currentResident) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Resident not found' 
          }, 
          { status: 404 }
        )
      }
      
      // Validate status transition
      const transitionValidation = statusTransitionSchema.safeParse({
        currentStatus: currentResident.status,
        newStatus: bodyObj.status as ResidentStatus
      })
      
      if (!transitionValidation.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid status transition',
            details: transitionValidation.error.issues
          }, 
          { status: 400 }
        )
      }
      
      try {
        const updatedResident = await residentService.update(id, { status: bodyObj.status as ResidentStatus })
        
        return NextResponse.json({
          success: true,
          data: updatedResident
        })
      } catch (error) {
        return NextResponse.json(
          { 
            success: false, 
            error: error instanceof Error ? error.message : 'Status transition failed' 
          }, 
          { status: 400 }
        )
      }
    }
    
    // Regular update validation
    const validation = residentUpdateSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid resident data',
          details: validation.error.issues
        }, 
        { status: 400 }
      )
    }
    
    // Simulate realistic delay for loading states
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const updatedResident = await residentService.update(id, validation.data as ResidentUpdateInput)
    
    return NextResponse.json({
      success: true,
      data: updatedResident
    })
  } catch (error) {
    console.error('Error updating resident:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      }, 
      { status: 500 }
    )
  }
}

// DELETE /api/residents/[id] - Soft delete (deactivate) resident
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params
    
    // Simulate realistic delay for loading states
    await new Promise(resolve => setTimeout(resolve, 300))
    
    try {
      const deactivatedResident = await residentService.update(id, { status: 'Deactivated' })
      
      return NextResponse.json({
        success: true,
        data: deactivatedResident,
        message: 'Resident has been deactivated'
      })
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to deactivate resident' 
        }, 
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error deactivating resident:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      }, 
      { status: 500 }
    )
  }
}