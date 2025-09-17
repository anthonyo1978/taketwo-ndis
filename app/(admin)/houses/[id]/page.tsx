"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

import { ResidentForm } from "../../../../components/residents/ResidentForm"
import { ResidentTable } from "../../../../components/residents/ResidentTable"
import { HouseImageUpload } from "../../../../components/houses/HouseImageUpload"
import type { House } from "../../../../types/house"
import type { Resident } from "../../../../types/resident"

interface ApiResponse {
  success: boolean
  data?: House
  error?: string
}

export default function HouseDetailPage() {
  const params = useParams()
  const id = params.id as string
  
  const [house, setHouse] = useState<House | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showResidentForm, setShowResidentForm] = useState(false)
  const [residentRefreshTrigger, setResidentRefreshTrigger] = useState(0)

  useEffect(() => {
    const fetchHouse = async () => {
      if (!id) return
      
      try {
        const response = await fetch(`/api/houses/${id}`)
        const result: ApiResponse = await response.json()
        
        if (result.success && result.data) {
          setHouse(result.data)
        } else {
          setError(result.error || 'House not found')
        }
      } catch (err) {
        setError('Failed to load house details')
        console.error('Error fetching house:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchHouse()
  }, [id])

  const handleResidentAdded = (_newResident: Resident) => {
    // Trigger refresh of resident table
    setResidentRefreshTrigger(prev => prev + 1)
  }

  const handleImageUploaded = (imageUrl: string) => {
    setHouse(prev => prev ? { ...prev, imageUrl } : null)
  }

  const handleImageRemoved = () => {
    setHouse(prev => prev ? { ...prev, imageUrl: undefined } : null)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !house) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-red-600 text-lg mb-4">
              {error || 'House not found'}
            </div>
            <Link
              href="/houses"
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Houses
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with Breadcrumb */}
        <div className="mb-8">
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <Link href="/houses" className="hover:text-gray-700">
              Houses
            </Link>
            <span>/</span>
            <span className="text-gray-900">
              {house.descriptor || `${house.address1}, ${house.suburb}`}
            </span>
          </nav>
          
          <div className="flex items-center justify-between">
            <div className="flex items-start space-x-6">
              {/* House Image */}
              <div className="flex-shrink-0">
                {house.imageUrl ? (
                  <img
                    src={house.imageUrl}
                    alt={house.descriptor || `${house.address1}, ${house.suburb}`}
                    className="w-24 h-24 rounded-lg object-cover border border-gray-200"
                    onError={(e) => {
                      console.error('House detail image failed to load:', house.imageUrl, e);
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={() => {
                      console.log('House detail image loaded successfully:', house.imageUrl);
                    }}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21l4-7 4 7" />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* House Details */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {house.descriptor || `${house.address1}${house.unit ? `, ${house.unit}` : ''}`}
                </h1>
                <p className="text-gray-600">
                  {house.descriptor ? (
                    <>
                      {house.address1}{house.unit && `, ${house.unit}`}<br />
                      {house.suburb}, {house.state} {house.postcode}, {house.country}
                    </>
                  ) : (
                    `${house.suburb}, ${house.state} ${house.postcode}, ${house.country}`
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                href={`/houses/${house.id}/edit`}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors inline-flex items-center gap-2"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit House
              </Link>
              
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                house.status === 'Active' 
                  ? 'bg-green-100 text-green-800'
                  : house.status === 'Vacant'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {house.status}
              </span>
              
              <Link
                href="/houses"
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ← Back to Houses
              </Link>
            </div>
          </div>
        </div>

        {/* House Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-600">House ID</dt>
                <dd className="text-lg font-mono text-gray-900">{house.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Address</dt>
                <dd className="text-gray-900">
                  {house.address1}
                  {house.unit && <span className="text-gray-500"> • {house.unit}</span>}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Location</dt>
                <dd className="text-gray-900">
                  {house.suburb}, {house.state} {house.postcode}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Country</dt>
                <dd className="text-gray-900">{house.country}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Status</dt>
                <dd>
                  <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${
                    house.status === 'Active' 
                      ? 'bg-green-100 text-green-800'
                      : house.status === 'Vacant'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {house.status}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Additional Details */}
          <div className="space-y-6">
            {/* Image Upload */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">House Image</h3>
              <HouseImageUpload
                houseId={house.id}
                currentImageUrl={house.imageUrl}
                onImageUploaded={handleImageUploaded}
                onImageRemoved={handleImageRemoved}
              />
            </div>

            {/* Property Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-600">Go-Live Date</dt>
                  <dd className="text-gray-900">
                    {new Date(house.goLiveDate).toLocaleDateString()}
                  </dd>
                </div>
                {house.resident && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Current Resident</dt>
                    <dd className="text-gray-900">{house.resident}</dd>
                  </div>
                )}
                {house.notes && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Notes</dt>
                    <dd className="text-gray-900 whitespace-pre-wrap">{house.notes}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Audit Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-600">Created</dt>
                  <dd className="text-gray-900">
                    {new Date(house.createdAt).toLocaleString()} by {house.createdBy}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">Last Updated</dt>
                  <dd className="text-gray-900">
                    {new Date(house.updatedAt).toLocaleString()} by {house.updatedBy}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Residents Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Residents</h2>
            <button
              onClick={() => setShowResidentForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Resident
            </button>
          </div>
          
          <ResidentTable 
            houseId={id} 
            refreshTrigger={residentRefreshTrigger}
          />
        </div>

        {/* Actions */}
        <div className="mt-8 flex gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Edit House
          </button>
          <button className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            View History
          </button>
        </div>

        {/* Resident Form Modal */}
        <ResidentForm
          houseId={id}
          open={showResidentForm}
          onClose={() => setShowResidentForm(false)}
          onSuccess={handleResidentAdded}
        />
      </div>
    </div>
  )
}