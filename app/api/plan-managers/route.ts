import { NextRequest, NextResponse } from "next/server"
import { planManagerService } from "lib/supabase/services/plan-managers"
import { planManagerCreateSchema } from "lib/schemas/plan-manager"
import { CACHE_MEDIUM } from "lib/utils/cache-headers"

// GET /api/plan-managers
// Fetch all plan managers for the current organization
export async function GET() {
  try {
    const planManagers = await planManagerService.getAll()
    
    return NextResponse.json(
      { 
        success: true, 
        data: planManagers 
      },
      { status: 200, headers: CACHE_MEDIUM }
    )
  } catch (error) {
    console.error('Get plan managers error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to fetch plan managers" 
      },
      { status: 500 }
    )
  }
}

// POST /api/plan-managers
// Create a new plan manager
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, any>
    
    // Validate request data
    const validation = planManagerCreateSchema.safeParse(body)
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
    
    const planManager = await planManagerService.create(validation.data)
    
    return NextResponse.json(
      { 
        success: true, 
        data: planManager,
        message: "Plan Manager created successfully"
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create plan manager error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to create plan manager" 
      },
      { status: 500 }
    )
  }
}

