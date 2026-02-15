import { createClient as createServerClient } from '../supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const BUCKET_NAME = 'resident-photos'

/**
 * Create a Supabase client with the service role key for server-side storage operations.
 * Falls back to the regular server client if the service role key is not available.
 */
function getStorageClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  if (serviceRoleKey) {
    // Use service role to bypass RLS — correct for server-side API route uploads
    return createSupabaseClient(supabaseUrl, serviceRoleKey)
  }
  // Fallback: use the regular server client (requires authenticated user session)
  return createServerClient()
}

/**
 * Ensure the resident-photos storage bucket exists, creating it if necessary.
 * Only needs the service role key to create buckets.
 */
async function ensureBucketExists(supabase: ReturnType<typeof createSupabaseClient>) {
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some(b => b.id === BUCKET_NAME)

  if (!exists) {
    console.log(`[photo-upload] Bucket "${BUCKET_NAME}" not found — creating it…`)
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5 MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    })
    if (error) {
      console.error(`[photo-upload] Failed to create bucket:`, error)
      throw new Error(`Storage bucket setup failed: ${error.message}`)
    }
    console.log(`[photo-upload] Bucket "${BUCKET_NAME}" created successfully`)
  }
}

/**
 * Upload a resident photo to Supabase Storage and return the public URL.
 * 
 * @param file - The photo File object
 * @param residentId - A unique identifier for the file name (can be a temp UUID for new residents)
 * @returns The public URL of the uploaded photo
 * @throws Error if upload fails
 */
export async function uploadResidentPhoto(file: File, residentId: string): Promise<string> {
  const supabase = await getStorageClient()

  // Auto-create the bucket if it doesn't exist yet
  await ensureBucketExists(supabase as ReturnType<typeof createSupabaseClient>)

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
  const supabase = await getStorageClient()

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
