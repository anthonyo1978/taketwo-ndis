"use client"

import { useState, useRef } from "react"
import { createClient } from "../../lib/supabase/client"
import { toast } from "react-hot-toast"

interface HouseImageUploadProps {
  houseId: string
  currentImageUrl?: string
  onImageUploaded: (imageUrl: string) => void
  onImageRemoved: () => void
}

export function HouseImageUpload({ 
  houseId, 
  currentImageUrl, 
  onImageUploaded, 
  onImageRemoved 
}: HouseImageUploadProps) {
  const [loading, setLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setSelectedFile(null)
      setPreviewUrl(currentImageUrl || null)
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      setSelectedFile(null)
      setPreviewUrl(currentImageUrl || null)
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      setSelectedFile(null)
      setPreviewUrl(currentImageUrl || null)
      return
    }

    setError(null)
    setSelectedFile(file)
    
    // Create preview URL
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${houseId}-${Date.now()}.${fileExt}`
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('house-images')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        throw new Error(`Upload failed: ${error.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('house-images')
        .getPublicUrl(fileName)

      const imageUrl = urlData.publicUrl
      
      // Update house record with new image URL via API
      const response = await fetch(`/api/houses/${houseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to update house: ${errorData.error || 'Unknown error'}`)
      }

      // Update local state
      setPreviewUrl(imageUrl)
      setSelectedFile(null)
      onImageUploaded(imageUrl)
      toast.success('House image uploaded successfully!')
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Upload failed')
      toast.error('Failed to upload image')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    if (!currentImageUrl) return

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Extract filename from URL
      const fileName = currentImageUrl.split('/').pop()
      if (fileName) {
        // Delete from storage
        await supabase.storage
          .from('house-images')
          .remove([fileName])
      }

      // Update house record to remove image URL via API
      const response = await fetch(`/api/houses/${houseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl: null }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to remove image: ${errorData.error || 'Unknown error'}`)
      }

      setPreviewUrl(null)
      setSelectedFile(null)
      onImageRemoved()
      toast.success('House image removed successfully!')
      
    } catch (error) {
      console.error('Remove error:', error)
      setError(error instanceof Error ? error.message : 'Failed to remove image')
      toast.error('Failed to remove image')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setPreviewUrl(currentImageUrl || null)
    setSelectedFile(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {/* Current Image Display */}
      {previewUrl && (
        <div className="flex items-center space-x-4">
          <img
            src={previewUrl}
            alt="House preview"
            className="w-24 h-24 rounded-lg object-cover border border-gray-200"
          />
          <div className="flex-1">
            <p className="text-sm text-gray-600">
              {selectedFile ? 'New image preview' : 'Current house image'}
            </p>
          </div>
        </div>
      )}

      {/* File Input */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="mt-1 text-xs text-gray-500">
          PNG, JPG, GIF up to 5MB
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        {selectedFile && (
          <>
            <button
              onClick={handleUpload}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Uploading...' : 'Upload Image'}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </>
        )}
        
        {currentImageUrl && !selectedFile && (
          <button
            onClick={handleRemove}
            disabled={loading}
            className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Removing...' : 'Remove Image'}
          </button>
        )}
      </div>
    </div>
  )
}
