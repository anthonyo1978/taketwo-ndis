import { NextRequest, NextResponse } from 'next/server'
import { residentService } from 'lib/supabase/services/residents'
import { uploadResidentPhoto, deleteResidentPhoto } from 'lib/utils/photo-upload'

interface RouteParams {
  id: string
}

// POST /api/residents/[id]/photo - Upload or replace resident photo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params

    // Verify resident exists
    const resident = await residentService.getById(id)
    if (!resident) {
      return NextResponse.json(
        { success: false, error: 'Resident not found' },
        { status: 404 }
      )
    }

    // Parse FormData
    const formData = await request.formData()
    const photoFile = formData.get('photo') as File | null

    if (!photoFile || photoFile.size === 0) {
      return NextResponse.json(
        { success: false, error: 'No photo file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!photoFile.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image (JPEG, PNG, GIF, or WebP)' },
        { status: 400 }
      )
    }

    // Validate file size (5MB)
    if (photoFile.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Photo must be less than 5MB' },
        { status: 400 }
      )
    }

    // Delete old photo if one exists
    if (resident.photoUrl) {
      try {
        await deleteResidentPhoto(resident.photoUrl)
      } catch (err) {
        console.warn('Failed to delete old photo (continuing):', err)
      }
    }

    // Upload new photo
    const photoUrl = await uploadResidentPhoto(photoFile, id)

    // Update resident record with new photo URL
    const updatedResident = await residentService.update(id, { photoUrl })

    return NextResponse.json({
      success: true,
      data: updatedResident,
      photoUrl
    })
  } catch (error) {
    console.error('Error uploading resident photo:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: `Failed to upload photo: ${message}` },
      { status: 500 }
    )
  }
}

// DELETE /api/residents/[id]/photo - Remove resident photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params

    const resident = await residentService.getById(id)
    if (!resident) {
      return NextResponse.json(
        { success: false, error: 'Resident not found' },
        { status: 404 }
      )
    }

    // Delete from storage
    if (resident.photoUrl) {
      try {
        await deleteResidentPhoto(resident.photoUrl)
      } catch (err) {
        console.warn('Failed to delete photo from storage (continuing):', err)
      }
    }

    // Clear photo URL on resident record
    const updatedResident = await residentService.update(id, { photoUrl: '' })

    return NextResponse.json({
      success: true,
      data: updatedResident
    })
  } catch (error) {
    console.error('Error deleting resident photo:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete photo' },
      { status: 500 }
    )
  }
}

