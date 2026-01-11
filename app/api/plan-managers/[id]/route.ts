import { NextRequest, NextResponse } from "next/server"
import { planManagerService } from "lib/supabase/services/plan-managers"
import { planManagerUpdateSchema } from "lib/schemas/plan-manager"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/plan-managers/[id]
// Fetch a single plan manager by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const planManager = await planManagerService.getById(id)
    
    return NextResponse.json(
      { 
        success: true, 
        data: planManager 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get plan manager error:', error)
    
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 500
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to fetch plan manager" 
      },
      { status }
    )
  }
}

// PUT /api/plan-managers/[id]
// Update an existing plan manager
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json() as Record<string, any>
    
    // Validate request data
    const validation = planManagerUpdateSchema.safeParse(body)
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
    
    const planManager = await planManagerService.update(id, validation.data)
    
    return NextResponse.json(
      { 
        success: true, 
        data: planManager,
        message: "Plan Manager updated successfully"
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update plan manager error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to update plan manager" 
      },
      { status: 500 }
    )
  }
}

// DELETE /api/plan-managers/[id]
// Delete a plan manager
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    await planManagerService.delete(id)
    
    return NextResponse.json(
      { 
        success: true,
        message: "Plan Manager deleted successfully"
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete plan manager error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to delete plan manager" 
      },
      { status: 500 }
    )
  }
}

