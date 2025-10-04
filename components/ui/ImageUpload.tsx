"use client"

import { useState, useRef } from "react"
import { Button } from "../Button/Button"
import { createClient } from "../../lib/supabase/client"
import { toast } from "react-hot-toast"

interface ImageUploadProps {
  currentImageUrl?: string
  onImageChange: (imageUrl: string | null) => void
  disabled?: boolean
  className?: string
}

/**
 * Image upload component with Supabase Storage integration.
 * Handles file validation, upload, and preview functionality.
 */
export function ImageUpload({ 
  currentImageUrl, 
  onImageChange, 
  disabled = false,
  className = ""
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return "Please upload a JPEG, PNG, or WebP image"
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return "Image must be smaller than 5MB"
    }

    return null
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setIsUploading(true)

    try {
      const supabase = createClient()
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `house-images/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('house-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('house-images')
        .getPublicUrl(filePath)

      const imageUrl = urlData.publicUrl
      
      // Update preview and parent component
      setPreviewUrl(imageUrl)
      onImageChange(imageUrl)
      
      toast.success("Image uploaded successfully!")
      
    } catch (error) {
      console.error('Upload error:', error)
      toast.error("Failed to upload image. Please try again.")
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = async () => {
    if (!previewUrl) return

    try {
      // Extract file path from URL for deletion
      const url = new URL(previewUrl)
      const pathParts = url.pathname.split('/')
      const filePath = pathParts.slice(-2).join('/') // Get 'house-images/filename'

      const supabase = createClient()
      
      // Delete from Supabase Storage
      const { error } = await supabase.storage
        .from('house-images')
        .remove([filePath])

      if (error) {
        console.error('Delete error:', error)
        // Don't show error to user for cleanup failures
      }

      // Update state
      setPreviewUrl(null)
      onImageChange(null)
      
      toast.success("Image removed")
      
    } catch (error) {
      console.error('Remove error:', error)
      toast.error("Failed to remove image")
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="hidden"
        />
        
        <Button
          type="button"
          intent="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="flex items-center gap-2"
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {previewUrl ? 'Change Image' : 'Upload Image'}
            </>
          )}
        </Button>

        {previewUrl && (
          <Button
            type="button"
            intent="secondary"
            onClick={handleRemoveImage}
            disabled={disabled || isUploading}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove
          </Button>
        )}
      </div>

      {previewUrl && (
        <div className="relative">
          <img
            src={previewUrl}
            alt="House preview"
            className="w-32 h-32 object-cover rounded-lg border border-gray-200"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-opacity rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-medium opacity-0 hover:opacity-100 transition-opacity">
              Click to view full size
            </span>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500">
        Upload a JPEG, PNG, or WebP image (max 5MB)
      </p>
    </div>
  )
}
