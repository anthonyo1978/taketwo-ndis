import { NextRequest, NextResponse } from "next/server"

import { residentCreateSchema } from "lib/schemas/resident"
import { residentService } from "lib/supabase/services/residents"
import { uploadResidentPhoto } from "lib/utils/photo-upload"
import { CACHE_SHORT } from "lib/utils/cache-headers"

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '25', 10)), 100) // Cap at 100
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
      { status: 200, headers: CACHE_SHORT }
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

    // Handle photo upload — upload to Supabase Storage instead of base64
    const photoFile = formData.get('photo') as File | null
    let photoUrl: string | undefined

    if (photoFile && photoFile.size > 0) {
      try {
        // Use a temp ID for the filename; will be associated with the resident after creation
        const tempId = crypto.randomUUID()
        photoUrl = await uploadResidentPhoto(photoFile, tempId)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('Photo upload error:', message, error)
        return NextResponse.json(
          { 
            success: false, 
            error: `Failed to process photo upload: ${message}` 
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

    // Prepare data for Supabase — use photoUrl (Storage) instead of photoBase64
    const residentData = {
      houseId: houseId || null,
      firstName: validation.data.firstName,
      lastName: validation.data.lastName,
      dateOfBirth: validation.data.dateOfBirth,
      gender: validation.data.gender,
      phone: validation.data.phone || undefined,
      email: validation.data.email || undefined,
      ndisId: validation.data.ndisId || undefined,
      photoUrl,
      notes: validation.data.notes || undefined,
    }

    // Create resident in Supabase
    const newResident = await residentService.create(residentData)

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
