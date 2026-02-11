import { createClient } from '../supabase/server'

const BUCKET_NAME = 'resident-photos'

/**
 * Upload a resident photo to Supabase Storage and return the public URL.
 * 
 * @param file - The photo File object
 * @param residentId - A unique identifier for the file name (can be a temp UUID for new residents)
 * @returns The public URL of the uploaded photo
 * @throws Error if upload fails
 */
export async function uploadResidentPhoto(file: File, residentId: string): Promise<string> {
  const supabase = await createClient()

  // Generate unique filename
  const fileExt = file.name.split('.').pop() || 'jpg'
  const fileName = `${residentId}-${Date.now()}.${fileExt}`

  // Convert File to ArrayBuffer then to Buffer for server-side upload
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('Photo upload error:', error)
    throw new Error(`Failed to upload photo: ${error.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

/**
 * Delete a resident photo from Supabase Storage.
 * 
 * @param photoUrl - The full public URL of the photo
 */
export async function deleteResidentPhoto(photoUrl: string): Promise<void> {
  const supabase = await createClient()

  // Extract the file path from the URL
  // URL format: https://<project>.supabase.co/storage/v1/object/public/resident-photos/<filename>
  const urlParts = photoUrl.split(`/storage/v1/object/public/${BUCKET_NAME}/`)
  if (urlParts.length < 2) return

  const filePath = urlParts[1]
  if (!filePath) return
  
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath])

  if (error) {
    console.error('Photo deletion error:', error)
    // Don't throw — deletion failures shouldn't block other operations
  }
}

