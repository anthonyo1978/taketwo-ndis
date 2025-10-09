"use client"

import Link from "next/link"
import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { calculateBalanceSummary } from "lib/utils/funding-calculations"
import { Pagination } from "components/ui/Pagination"
import { ResidentSearchAndFilter } from "components/ui/ResidentSearchAndFilter"
import type { House } from "types/house"
import type { Resident } from "types/resident"

interface ApiResponse {
  success: boolean
  data?: Resident[]
  error?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

interface HousesApiResponse {
  success: boolean
  data?: House[]
  error?: string
}

interface GlobalResidentTableProps {
  refreshTrigger?: number // Used to trigger re-fetch when new resident added
}

export function GlobalResidentTable({ refreshTrigger }: GlobalResidentTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [residents, setResidents] = useState<Resident[]>([])
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination state - initialize from URL params
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'))
  const [pageSize, setPageSize] = useState(parseInt(searchParams.get('pageSize') || '25'))
  
  // Filtering state - initialize from URL params
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  )

  // Debounced search state
  const [debouncedSearch, setDebouncedSearch] = useState(search)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Build query parameters for residents API
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: debouncedSearch,
        status,
        sortBy,
        sortOrder
      })
      
      // Fetch both residents and houses in parallel
      const [residentsResponse, housesResponse] = await Promise.all([
        fetch(`/api/residents?${params}`),
        fetch('/api/houses')
      ])
      
      const [residentsResult, housesResult] = await Promise.all([
        residentsResponse.json() as Promise<ApiResponse>,
        housesResponse.json() as Promise<HousesApiResponse>
      ])
      
      if (residentsResult.success && residentsResult.data) {
        setResidents(residentsResult.data)
        // Note: We're not using server-side pagination yet, so we still use client-side pagination
        // The API returns all matching results, and we paginate them on the client
      } else {
        setError(residentsResult.error || 'Failed to load residents')
        return
      }

      if (housesResult.success && housesResult.data) {
        setHouses(housesResult.data)
      } else {
        setError(housesResult.error || 'Failed to load houses')
        return
      }
      
      setError(null)
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, debouncedSearch, status, sortBy, sortOrder])

  // Function to update URL params when pagination or filters change
  const updateUrlParams = (newParams: {
    page?: number
    pageSize?: number
    search?: string
    status?: string
    sortBy?: string
    sortOrder?: string
  }) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (newParams.page !== undefined) params.set('page', newParams.page.toString())
    if (newParams.pageSize !== undefined) params.set('pageSize', newParams.pageSize.toString())
    if (newParams.search !== undefined) {
      if (newParams.search) params.set('search', newParams.search)
      else params.delete('search')
    }
    if (newParams.status !== undefined) {
      if (newParams.status) params.set('status', newParams.status)
      else params.delete('status')
    }
    if (newParams.sortBy !== undefined) params.set('sortBy', newParams.sortBy)
    if (newParams.sortOrder !== undefined) params.set('sortOrder', newParams.sortOrder)
    
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    fetchData()
  }, [fetchData, refreshTrigger])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Debounce timer ref
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sync debouncedSearch with initial search value
  useEffect(() => {
    setDebouncedSearch(search)
  }, [])

  // Filter handler functions
  const handleSearchChange = (value: string) => {
    setSearch(value)
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value)
      setCurrentPage(1) // Reset to first page
      updateUrlParams({ search: value, page: 1 })
    }, 500) // 500ms debounce
  }

  const handleStatusChange = (value: string) => {
    setStatus(value)
    setCurrentPage(1) // Reset to first page
    updateUrlParams({ status: value, page: 1 })
  }

  const handleSortByChange = (value: string) => {
    setSortBy(value)
    setCurrentPage(1) // Reset to first page
    updateUrlParams({ sortBy: value, page: 1 })
  }

  const handleSortOrderChange = (value: 'asc' | 'desc') => {
    setSortOrder(value)
    setCurrentPage(1) // Reset to first page
    updateUrlParams({ sortOrder: value, page: 1 })
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    updateUrlParams({ page })
  }

  const retryFetch = () => {
    setError(null)
    fetchData()
  }


  // Get house name for a resident
  const getHouseName = (houseId: string): string => {
    const house = houses.find(h => h.id === houseId)
    if (!house) return 'Unknown House'
    return house.descriptor || `${house.address1}, ${house.suburb}`
  }

  // Pagination calculations
  const totalResidents = residents.length
  const totalPages = Math.ceil(totalResidents / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedResidents = residents.slice(startIndex, endIndex)

  // Loading state with skeleton table
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Residents</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Photo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  House
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Age
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Gender
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  NDIS ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[1, 2, 3].map(i => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-12" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-12" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Error state with retry
  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="text-red-600 text-lg mb-4">{error}</div>
        <button 
          onClick={retryFetch}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Empty state
  if (residents.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No residents found</h3>
        <p className="text-gray-600">No residents have been created yet.</p>
      </div>
    )
  }

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: Date): number => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  // Get status color for badges
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800'
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'Deactivated':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Calculate contract balance summary
  const getContractSummary = (fundingInfo: Resident['fundingInformation']) => {
    if (!fundingInfo || fundingInfo.length === 0) {
      return { totalCurrent: 0, activeContracts: 0, expiringSoon: 0 }
    }
    return calculateBalanceSummary(fundingInfo)
  }

  // Success state - residents table
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          All Residents ({residents.length})
        </h3>
      </div>

      {/* Search and Filter */}
      <div className="px-6 py-4">
        <ResidentSearchAndFilter
          searchValue={search}
          onSearchChange={handleSearchChange}
          statusValue={status}
          onStatusChange={handleStatusChange}
          sortBy={sortBy}
          onSortByChange={handleSortByChange}
          sortOrder={sortOrder}
          onSortOrderChange={handleSortOrderChange}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Photo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                House
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                Funding
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                Age
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                Gender
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                NDIS ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedResidents.map((resident) => (
              <tr key={resident.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex-shrink-0 h-10 w-10">
                    {resident.photoBase64 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="h-10 w-10 rounded-full object-cover"
                        src={resident.photoBase64}
                        alt={`${resident.firstName} ${resident.lastName}`}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-gray-600 text-sm font-medium">
                          {resident.firstName.charAt(0)}{resident.lastName.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link 
                    href={`/residents/${resident.id}`}
                    className="block hover:bg-blue-50 rounded p-1 -m-1 transition-colors"
                  >
                    <div className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      {resident.firstName} {resident.lastName}
                    </div>
                    <div className="text-sm text-gray-500">
                      ID: {resident.id}
                    </div>
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link 
                    href={`/houses/${resident.houseId}`}
                    className="block hover:bg-blue-50 rounded p-1 -m-1 transition-colors"
                  >
                    <div className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      {getHouseName(resident.houseId)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {resident.houseId}
                    </div>
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(resident.status || 'Draft')}`}>
                    {resident.status || 'Draft'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {resident.fundingInformation && resident.fundingInformation.length > 0 ? (
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        ${getContractSummary(resident.fundingInformation).totalCurrent.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center space-x-2">
                        <span>
                          {getContractSummary(resident.fundingInformation).activeContracts} active
                        </span>
                        {getContractSummary(resident.fundingInformation).expiringSoon > 0 && (
                          <span className="px-1 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                            {getContractSummary(resident.fundingInformation).expiringSoon} expiring
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">No contracts</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {calculateAge(resident.dateOfBirth)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {resident.gender}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {resident.phone || '-'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {resident.email || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {resident.ndisId || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(resident.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-3">
                    <Link 
                      href={`/residents/${resident.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View
                    </Link>
                    <Link 
                      href={`/residents/${resident.id}/edit`}
                      className="text-green-600 hover:text-green-800"
                    >
                      Edit
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalResidents > 0 && (
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            {/* Results Info */}
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(endIndex, totalResidents)} of{' '}
                {totalResidents.toLocaleString()} residents
              </div>
              
              {/* Page Size Selector */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Show:</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newPageSize = Number(e.target.value)
                    setPageSize(newPageSize)
                    setCurrentPage(1) // Reset to first page when changing page size
                    updateUrlParams({ pageSize: newPageSize, page: 1 })
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-600">per page</span>
              </div>
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              showFirstLast={true}
              maxVisiblePages={5}
            />
          </div>
        </div>
      )}
    </div>
  )
}