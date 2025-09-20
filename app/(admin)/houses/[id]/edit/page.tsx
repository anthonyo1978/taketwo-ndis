"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { toast } from "react-hot-toast"
import { HouseForm } from "components/houses/HouseForm"
import { ImageUpload } from "components/ui/ImageUpload"
import type { House, HouseCreateInput } from "types/house"

/**
 * Page for editing an existing house.
 * Allows updating house details and uploading/changing house images.
 */
export default function EditHousePage() {
  const router = useRouter()
  const params = useParams()
  const houseId = params.id as string

  const [house, setHouse] = useState<House | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  // Fetch house data
  useEffect(() => {
    const fetchHouse = async () => {
      try {
        const response = await fetch(`/api/houses/${houseId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch house')
        }
        
        const result = await response.json()
        if (result.success) {
          setHouse(result.data)
          setImageUrl(result.data.imageUrl || null)
        } else {
          throw new Error(result.error || 'Failed to fetch house')
        }
      } catch (err) {
        console.error('Error fetching house:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch house')
      } finally {
        setIsLoading(false)
      }
    }

    if (houseId) {
      fetchHouse()
    }
  }, [houseId])

  const handleFormSubmit = async (data: HouseCreateInput) => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/houses/${houseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          imageUrl: imageUrl
        }),
      })

      const result = await response.json()

      if (result.success) {
        const updatedHouse = result.data as House
        const houseIdentifier = updatedHouse.descriptor || `${updatedHouse.address1}, ${updatedHouse.suburb}`
        
        toast.success(`House "${houseIdentifier}" updated successfully!`, {
          duration: 4000,
        })
        
        setTimeout(() => {
          router.push(`/houses/${houseId}`)
        }, 1000)
      } else {
        throw new Error(result.error || 'Failed to update house')
      }
    } catch (err) {
      console.error('Error updating house:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to update house'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleImageChange = (newImageUrl: string | null) => {
    setImageUrl(newImageUrl)
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="bg-white rounded-lg border p-8">
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg border border-red-200 p-8 text-center">
            <div className="text-red-600 text-lg mb-4">{error}</div>
            <div className="space-x-4">
              <button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <Link 
                href="/houses"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Houses
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!house) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">House not found</h3>
            <p className="text-gray-600 mb-4">The house you're looking for doesn't exist.</p>
            <Link 
              href="/houses"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Houses
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb Navigation */}
        <nav className="mb-8">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Link href="/houses" className="hover:text-gray-700">
              Houses
            </Link>
            <span>/</span>
            <Link 
              href={`/houses/${house.id}`} 
              className="hover:text-gray-700"
            >
              {house.descriptor || `${house.address1}, ${house.suburb}`}
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Edit</span>
          </div>
        </nav>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Edit House
          </h1>
          <p className="text-gray-600">
            Update house details and manage the house image
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg border p-8">
          <div className="space-y-8">
            {/* Image Upload Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">House Image</h3>
              <ImageUpload
                currentImageUrl={imageUrl || undefined}
                onImageChange={handleImageChange}
                disabled={isSaving}
              />
            </div>

            {/* House Form */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">House Details</h3>
              <HouseForm
                onSubmit={handleFormSubmit}
                isLoading={isSaving}
                defaultValues={{
                  descriptor: house.descriptor || '',
                  address1: house.address1,
                  unit: house.unit || '',
                  suburb: house.suburb,
                  state: house.state,
                  postcode: house.postcode,
                  country: house.country,
                  status: house.status,
                  notes: house.notes || '',
                  goLiveDate: new Date(house.goLiveDate),
                  resident: house.resident || ''
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
