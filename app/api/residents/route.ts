import { NextRequest, NextResponse } from "next/server"

import { residentCreateSchema } from "lib/schemas/resident"
import { residentService } from "lib/supabase/services/residents"
import { fileToBase64 } from "lib/utils/resident-storage"

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 100) // Cap at 100
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const dateRange = searchParams.get('dateRange') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'

    // Server-side paginated query — search, filter, sort, and pagination all happen in Supabase
    const result = await residentService.getPaginated({
      page,
      limit,
      search,
      status,
      dateRange,
      sortBy,
      sortOrder
    })

    return NextResponse.json(
      { 
        success: true, 
        data: result.residents,
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
    console.error('Global residents retrieval error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to load residents" 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Add delay to simulate realistic API behavior
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Parse FormData for file upload support
    const formData = await request.formData()
    
    // Extract form fields including houseId for global creation
    const body = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      dateOfBirth: formData.get('dateOfBirth') as string,
      gender: formData.get('gender') as string,
      phone: formData.get('phone') as string || undefined,
      email: formData.get('email') as string || undefined,
      ndisId: formData.get('ndisId') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    }

    // Get houseId from form data (optional for global creation)
    const houseId = formData.get('houseId') as string

    // If no houseId provided, we'll create a Prospect resident without house assignment
    // This allows residents to be created and assigned to houses later

    // Verify house exists (we'll need to import houseService for this)
    // For now, we'll skip this validation and let the database handle it

    // Handle photo upload
    const photoFile = formData.get('photo') as File | null
    let photoBase64: string | undefined

    console.log('[RESIDENT CREATE] Photo file received:', photoFile ? `${photoFile.name} (${photoFile.size} bytes)` : 'No photo')

    if (photoFile && photoFile.size > 0) {
      try {
        photoBase64 = await fileToBase64(photoFile)
        console.log('[RESIDENT CREATE] Photo converted to base64, length:', photoBase64?.length)
      } catch (error) {
        console.error('Photo conversion error:', error)
        return NextResponse.json(
          { 
            success: false, 
            error: "Failed to process photo upload" 
          },
          { status: 400 }
        )
      }
    }

    // Create validation object for server-side
    const validationData = {
      ...body,
      photo: photoFile || undefined // Server-side validation will pass through
    }

    // Validate request data
    const validation = residentCreateSchema.safeParse(validationData)
    
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

    // Prepare data for Supabase
    const residentData = {
      houseId: houseId || null, // Allow null for Prospect residents without house assignment
      firstName: validation.data.firstName,
      lastName: validation.data.lastName,
      dateOfBirth: validation.data.dateOfBirth,
      gender: validation.data.gender,
      phone: validation.data.phone || undefined,
      email: validation.data.email || undefined,
      ndisId: validation.data.ndisId || undefined,
      photoBase64,
      notes: validation.data.notes || undefined,
    }

    console.log('[RESIDENT CREATE] Data being sent to Supabase:', {
      ...residentData,
      photoBase64: photoBase64 ? `base64 string (length: ${photoBase64.length})` : 'none'
    })

    // Create resident in Supabase
    const newResident = await residentService.create(residentData)
    
    console.log('[RESIDENT CREATE] Created resident:', {
      id: newResident.id,
      name: `${newResident.firstName} ${newResident.lastName}`,
      hasPhoto: !!newResident.photoBase64
    })

    return NextResponse.json(
      { 
        success: true, 
        data: newResident 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Global resident creation error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error" 
      },
      { status: 500 }
    )
  }
}