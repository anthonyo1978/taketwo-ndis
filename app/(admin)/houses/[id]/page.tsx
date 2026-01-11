"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

import { ResidentSelectionModal } from "components/residents/ResidentSelectionModal"
import { ResidentTable } from "components/residents/ResidentTable"
import { HouseImageUpload } from "components/houses/HouseImageUpload"
import { OccupancyBadge } from "components/houses/OccupancyBadge"
import { OccupancyHeatmap } from "components/houses/OccupancyHeatmap"
import { OccupancyHistoryGrid } from "components/houses/OccupancyHistoryGrid"
import { OwnerSummaryCard } from "components/owners/OwnerSummaryCard"
import { OwnerModal } from "components/owners/OwnerModal"
import { HeadLeaseCard } from "components/head-leases/HeadLeaseCard"
import { HeadLeaseModal } from "components/head-leases/HeadLeaseModal"
import { HouseSuppliersList } from "components/suppliers/HouseSuppliersList"
import { LinkSupplierModal } from "components/suppliers/LinkSupplierModal"
import { UtilitySnapshotsList } from "components/utilities/UtilitySnapshotsList"
import { AddUtilitySnapshotModal } from "components/utilities/AddUtilitySnapshotModal"
import type { House } from "types/house"
import type { Resident } from "types/resident"
import type { HeadLease } from "types/head-lease"

interface OccupancyData {
  current: {
    occupied_bedrooms: number
    total_bedrooms: number
    occupancy_rate: number
  }
  history: Array<{
    month_start: string
    month_name: string
    occupied_bedrooms: number
    total_bedrooms: number
    occupancy_rate: number
  }>
}

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
  const [showResidentSelection, setShowResidentSelection] = useState(false)
  const [residentRefreshTrigger, setResidentRefreshTrigger] = useState(0)
  const [currentResidents, setCurrentResidents] = useState<Resident[]>([])
  const [occupancyData, setOccupancyData] = useState<OccupancyData | null>(null)
  const [occupancyLoading, setOccupancyLoading] = useState(true)
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'details' | 'ownership' | 'suppliers' | 'utilities'>('details')
  
  // Ownership & Lease state
  const [currentLease, setCurrentLease] = useState<HeadLease | null>(null)
  const [leaseLoading, setLeaseLoading] = useState(false)
  const [showOwnerModal, setShowOwnerModal] = useState(false)
  const [showLeaseModal, setShowLeaseModal] = useState(false)
  
  // Suppliers state
  const [showLinkSupplierModal, setShowLinkSupplierModal] = useState(false)
  const [supplierRefreshTrigger, setSupplierRefreshTrigger] = useState(0)
  
  // Utilities state
  const [showElectricityModal, setShowElectricityModal] = useState(false)
  const [showWaterModal, setShowWaterModal] = useState(false)
  const [electricityRefreshTrigger, setElectricityRefreshTrigger] = useState(0)
  const [waterRefreshTrigger, setWaterRefreshTrigger] = useState(0)

  useEffect(() => {
    const fetchHouse = async () => {
      if (!id) return
      
      try {
        const response = await fetch(`/api/houses/${id}`)
        const result = await response.json() as ApiResponse
        
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

  // Fetch occupancy data
  useEffect(() => {
    const fetchOccupancy = async () => {
      if (!id) return
      
      try {
        const response = await fetch(`/api/houses/${id}/occupancy`)
        const result = await response.json() as { success: boolean; data?: OccupancyData }
        
        if (result.success && result.data) {
          setOccupancyData(result.data)
        }
      } catch (err) {
        console.error('Error fetching occupancy:', err)
      } finally {
        setOccupancyLoading(false)
      }
    }

    fetchOccupancy()
  }, [id, residentRefreshTrigger])

  // Fetch lease data when ownership tab is active
  useEffect(() => {
    if (activeTab === 'ownership' && id) {
      fetchLeaseData()
    }
  }, [activeTab, id])

  const fetchLeaseData = async () => {
    setLeaseLoading(true)
    try {
      const response = await fetch(`/api/head-leases?houseId=${id}`)
      const result = await response.json() as { success: boolean; data?: HeadLease[] }
      if (result.success && result.data && result.data.length > 0) {
        setCurrentLease(result.data[0] || null) // Get the first lease (active or most recent)
      } else {
        setCurrentLease(null)
      }
    } catch (error) {
      console.error('Error fetching lease:', error)
    } finally {
      setLeaseLoading(false)
    }
  }

  const handleResidentAssigned = async (resident: Resident, roomLabel?: string, moveInDate?: Date) => {
    try {
      const response = await fetch(`/api/houses/${id}/residents/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          residentId: resident.id,
          roomLabel: roomLabel,
          moveInDate: moveInDate 
        })
      })

      const result = await response.json() as { success: boolean; message?: string; error?: string }

      if (result.success) {
        // Close the modal first
        setShowResidentSelection(false)
        // Small delay to ensure database is updated
        await new Promise(resolve => setTimeout(resolve, 200))
        // Trigger refresh of resident table
        setResidentRefreshTrigger(prev => prev + 1)
        // You could add a toast notification here
        console.log(result.message)
      } else {
        console.error('Failed to assign resident:', result.error)
        // You could add error toast notification here
      }
    } catch (error) {
      console.error('Error assigning resident:', error)
      // You could add error toast notification here
    }
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
                className="bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors inline-flex items-center gap-2 text-sm font-medium"
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

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Details & Residents
            </button>
            <button
              onClick={() => setActiveTab('ownership')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'ownership'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Ownership & Lease
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'suppliers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Suppliers
            </button>
            <button
              onClick={() => setActiveTab('utilities')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'utilities'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Utilities & Charges
            </button>
          </nav>
        </div>

        {/* Details Tab */}
        {activeTab === 'details' && (
          <>
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
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">House Image</h3>
                {house.imageUrl && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to remove this image?')) {
                        handleImageRemoved()
                      }
                    }}
                    className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                  >
                    Remove Image
                  </button>
                )}
              </div>
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
                  <dt className="text-sm font-medium text-gray-600">Bedrooms</dt>
                  <dd className="text-gray-900">
                    {house.bedroomCount || 'Not set'}
                  </dd>
                </div>
                
                {/* SDA Classification */}
                {(house.dwellingType || house.sdaDesignCategory || house.sdaRegistrationStatus) && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">SDA Classification</dt>
                    <dd className="text-gray-900">
                      <div className="flex flex-wrap gap-2 mt-1">
                        {house.dwellingType && (
                          <span className="inline-flex px-2.5 py-1 text-sm font-medium rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {house.dwellingType}
                          </span>
                        )}
                        {house.sdaDesignCategory && (
                          <span className="inline-flex px-2.5 py-1 text-sm font-medium rounded bg-purple-50 text-purple-700 border border-purple-200">
                            {house.sdaDesignCategory}
                          </span>
                        )}
                        {house.sdaRegistrationStatus && (
                          <span className="inline-flex px-2.5 py-1 text-sm font-medium rounded bg-green-50 text-green-700 border border-green-200">
                            {house.sdaRegistrationStatus}
                          </span>
                        )}
                      </div>
                    </dd>
                  </div>
                )}
                
                {/* OOA */}
                {house.hasOoa && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">OOA (Onsite Overnight Assistance)</dt>
                    <dd className="text-gray-900">
                      <div className="flex items-start gap-2">
                        <span className="inline-flex px-2.5 py-1 text-sm font-semibold rounded-full bg-amber-100 text-amber-800">
                          Yes
                        </span>
                        {house.ooaNotes && (
                          <span className="text-sm text-gray-600 mt-0.5">
                            {house.ooaNotes}
                          </span>
                        )}
                      </div>
                    </dd>
                  </div>
                )}
                
                <div>
                  <dt className="text-sm font-medium text-gray-600">Go-Live Date</dt>
                  <dd className="text-gray-900">
                    {new Date(house.goLiveDate).toLocaleDateString()}
                  </dd>
                </div>
                
                {house.enrolmentDate && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Enrolment Date</dt>
                    <dd className="text-gray-900">
                      {new Date(house.enrolmentDate).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                
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

            {/* Occupancy History */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Occupancy History</h3>
              {occupancyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="ml-3 text-gray-600">Loading history...</p>
                </div>
              ) : !house.bedroomCount || house.bedroomCount === 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="size-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-blue-900">Setup Required</p>
                      <p className="text-sm text-blue-700 mt-1">
                        To view occupancy history, please:
                      </p>
                      <ol className="text-sm text-blue-700 mt-2 ml-4 list-decimal space-y-1">
                        <li>Click "Edit House" above</li>
                        <li>Set the "Number of Bedrooms" field</li>
                        <li>Save and return to this page</li>
                      </ol>
                    </div>
                  </div>
                </div>
              ) : occupancyData && occupancyData.current ? (
                <OccupancyHistoryGrid
                  houseId={house.id}
                  currentOccupiedBedrooms={occupancyData.current.occupied_bedrooms}
                  totalBedrooms={occupancyData.current.total_bedrooms}
                />
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="size-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-amber-900">Data Not Available</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Occupancy tracking requires the bedroom count to be set. Current value: {house.bedroomCount || 'Not set'}
                      </p>
                      <p className="text-sm text-amber-700 mt-2">
                        If you just set the bedroom count, please refresh the page.
                      </p>
                    </div>
                  </div>
                </div>
              )}
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

        {/* Occupancy Analytics Section */}
        {occupancyData && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Occupancy Analytics</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Track bedroom utilization and performance over time
                </p>
              </div>
              
              {/* Current Occupancy Badge */}
              <OccupancyBadge
                occupiedBedrooms={occupancyData.current.occupied_bedrooms}
                totalBedrooms={occupancyData.current.total_bedrooms}
                size="lg"
                showDetails={true}
              />
            </div>
            
            {/* 12-Month Heatmap */}
            {occupancyData.history && occupancyData.history.length > 0 && (
              <OccupancyHeatmap 
                data={occupancyData.history}
                totalBedrooms={occupancyData.current.total_bedrooms}
              />
            )}
          </div>
        )}

        {/* Residents Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Residents</h2>
            <button
              onClick={() => setShowResidentSelection(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Assign Resident
            </button>
          </div>
          
          <ResidentTable 
            houseId={id} 
            refreshTrigger={residentRefreshTrigger}
            onResidentsLoaded={(residents) => {
              // Only update if the residents list has actually changed
              setCurrentResidents(prev => {
                const prevIds = prev.map(r => r.id).sort()
                const newIds = residents.map(r => r.id).sort()
                if (prevIds.length !== newIds.length || !prevIds.every((id, index) => id === newIds[index])) {
                  return residents
                }
                return prev
              })
            }}
            onResidentRemoved={() => setResidentRefreshTrigger(prev => prev + 1)}
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
          </>
        )}

        {/* Ownership & Lease Tab */}
        {activeTab === 'ownership' && (
          <div className="space-y-8">
            {leaseLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="ml-3 text-gray-600">Loading lease information...</p>
              </div>
            ) : currentLease ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Owner Summary */}
                {currentLease.owner && (
                  <OwnerSummaryCard owner={currentLease.owner} onUpdate={fetchLeaseData} />
                )}
                
                {/* Head Lease */}
                <HeadLeaseCard lease={currentLease} onUpdate={fetchLeaseData} />
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No Head Lease</h3>
                <p className="mt-2 text-sm text-gray-500">
                  This property doesn't have a head lease yet. Create one to track ownership and lease details.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setShowOwnerModal(true)}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Add Owner First
                  </button>
                  <button
                    onClick={() => setShowLeaseModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Head Lease
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Suppliers Tab */}
        {activeTab === 'suppliers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Linked Suppliers</h2>
                <p className="text-sm text-gray-600 mt-1">Manage maintenance and service providers for this property</p>
              </div>
              <button
                onClick={() => setShowLinkSupplierModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Link Supplier
              </button>
            </div>
            
            <HouseSuppliersList 
              houseId={id} 
              refreshTrigger={supplierRefreshTrigger}
              onUpdate={() => setSupplierRefreshTrigger(prev => prev + 1)}
            />
          </div>
        )}

        {/* Utilities & Charges Tab */}
        {activeTab === 'utilities' && house && house.id && (
          <div className="space-y-6">
            {/* Electricity Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Electricity</h2>
                  {house.electricityNmi && (
                    <p className="text-sm text-gray-600 mt-1">NMI: {house.electricityNmi}</p>
                  )}
                </div>
              </div>
              <UtilitySnapshotsList
                propertyId={house.id}
                utilityType="electricity"
                onAddSnapshot={() => setShowElectricityModal(true)}
                refreshTrigger={electricityRefreshTrigger}
              />
            </div>

            {/* Water Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Water</h2>
              </div>
              <UtilitySnapshotsList
                propertyId={house.id}
                utilityType="water"
                onAddSnapshot={() => setShowWaterModal(true)}
                refreshTrigger={waterRefreshTrigger}
              />
            </div>
          </div>
        )}

        {/* Resident Selection Modal */}
        <ResidentSelectionModal
          open={showResidentSelection}
          onClose={() => setShowResidentSelection(false)}
          onSelect={handleResidentAssigned}
          houseId={id}
          excludeResidentIds={currentResidents.map(r => r.id)}
          key={`modal-${residentRefreshTrigger}`}
        />

        {/* Owner Modal */}
        <OwnerModal
          isOpen={showOwnerModal}
          onClose={() => setShowOwnerModal(false)}
          onSuccess={fetchLeaseData}
          mode="create"
        />

        {/* Head Lease Modal */}
        <HeadLeaseModal
          isOpen={showLeaseModal}
          onClose={() => setShowLeaseModal(false)}
          onSuccess={fetchLeaseData}
          houseId={id}
          mode="create"
        />

        {/* Link Supplier Modal */}
        <LinkSupplierModal
          isOpen={showLinkSupplierModal}
          onClose={() => setShowLinkSupplierModal(false)}
          onSuccess={() => {
            setShowLinkSupplierModal(false)
            setSupplierRefreshTrigger(prev => prev + 1)
          }}
          houseId={id}
        />

        {/* Utility Snapshot Modals */}
        <AddUtilitySnapshotModal
          isOpen={showElectricityModal}
          onClose={() => setShowElectricityModal(false)}
          onSuccess={() => {
            setShowElectricityModal(false)
            setElectricityRefreshTrigger(prev => prev + 1)
          }}
          propertyId={id}
          utilityType="electricity"
        />

        <AddUtilitySnapshotModal
          isOpen={showWaterModal}
          onClose={() => setShowWaterModal(false)}
          onSuccess={() => {
            setShowWaterModal(false)
            setWaterRefreshTrigger(prev => prev + 1)
          }}
          propertyId={id}
          utilityType="water"
        />
      </div>
    </div>
  )
}