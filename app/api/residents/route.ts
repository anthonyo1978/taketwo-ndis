import { NextRequest, NextResponse } from "next/server"

import { residentCreateSchema } from "lib/schemas/resident"
import { residentService } from "lib/supabase/services/residents"
import { fileToBase64 } from "lib/utils/resident-storage"

export async function GET(request: NextRequest) {
  try {
    // Add delay to simulate realistic API behavior
    await new Promise((resolve) => setTimeout(resolve, 300))

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'

    // Get all residents from Supabase
    const residents = await residentService.getAll()

    // Apply client-side filtering and sorting (for now)
    // TODO: Move this to server-side for better performance
    let filteredResidents = residents

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filteredResidents = filteredResidents.filter(resident =>
        resident.firstName?.toLowerCase().includes(searchLower) ||
        resident.lastName?.toLowerCase().includes(searchLower) ||
        resident.email?.toLowerCase().includes(searchLower) ||
        resident.phone?.includes(search)
      )
    }

    // Apply status filter
    if (status) {
      filteredResidents = filteredResidents.filter(resident => resident.status === status)
    }

    // Apply sorting
    filteredResidents.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'firstName':
          aValue = a.firstName || ''
          bValue = b.firstName || ''
          break
        case 'lastName':
          aValue = a.lastName || ''
          bValue = b.lastName || ''
          break
        case 'status':
          aValue = a.status || ''
          bValue = b.status || ''
          break
        case 'email':
          aValue = a.email || ''
          bValue = b.email || ''
          break
        case 'created_at':
        default:
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
    })

    // Apply pagination
    const total = filteredResidents.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginatedResidents = filteredResidents.slice(offset, offset + limit)

    return NextResponse.json(
      { 
        success: true, 
        data: paginatedResidents,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
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

    if (photoFile && photoFile.size > 0) {
      try {
        photoBase64 = await fileToBase64(photoFile)
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