"use client"

import Link from "next/link"
import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { calculateBalanceSummary } from "lib/utils/funding-calculations"
import { Pagination } from "components/ui/Pagination"
import { StandardizedFiltersResidents } from "components/ui/StandardizedFiltersResidents"
import { LoadingSpinner } from "components/ui/LoadingSpinner"
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
  const [pageSize, setPageSize] = useState(parseInt(searchParams.get('pageSize') || '10'))
  
  // Filtering state - initialize from URL params
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [dateRange, setDateRange] = useState(searchParams.get('dateRange') || '')
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
        dateRange,
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
  }, [currentPage, pageSize, debouncedSearch, status, dateRange, sortBy, sortOrder])

  // Function to update URL params when pagination or filters change
  const updateUrlParams = (newParams: {
    page?: number
    pageSize?: number
    search?: string
    status?: string
    dateRange?: string
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
    if (newParams.dateRange !== undefined) {
      if (newParams.dateRange) params.set('dateRange', newParams.dateRange)
      else params.delete('dateRange')
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
    // Just update the input value, don't trigger search yet
  }

  const handleSearchSubmit = (value: string) => {
    // Trigger search on Enter key
    setDebouncedSearch(value)
    setCurrentPage(1)
    updateUrlParams({ search: value, page: 1 })
  }

  const handleStatusChange = (value: string) => {
    setStatus(value)
    setCurrentPage(1) // Reset to first page
    updateUrlParams({ status: value, page: 1 })
  }

  const handleDateRangeChange = (value: string) => {
    setDateRange(value)
    setCurrentPage(1) // Reset to first page
    updateUrlParams({ dateRange: value, page: 1 })
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

  const handleImport = () => {
    // TODO: Implement import functionality
    console.log('Import clicked - not yet implemented')
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export clicked - not yet implemented')
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

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-12">
          <LoadingSpinner size="lg" message="Loading residents..." />
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

  // Check if we have an empty result due to filters
  const isEmpty = residents.length === 0
  const hasActiveFilters = search || status || dateRange

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
    <>
      {/* Standardized Filters */}
      <StandardizedFiltersResidents
        searchValue={search}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        statusValue={status}
        onStatusChange={handleStatusChange}
        dateRangeValue={dateRange}
        onDateRangeChange={handleDateRangeChange}
        onImport={handleImport}
        onExport={handleExport}
        className="mb-6"
      />

      <div className="bg-white rounded-lg border border-gray-200">
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                House
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                Contact
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
            {isEmpty ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No residents found</h3>
                    <p className="text-gray-600">
                      {hasActiveFilters 
                        ? "Try adjusting your filters to see more results." 
                        : "Get started by adding your first resident."
                      }
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedResidents.map((resident) => (
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
                  </Link>
                </td>
                <td className="px-6 py-4 w-[120px]">
                  <Link 
                    href={`/houses/${resident.houseId}`}
                    className="block hover:bg-blue-50 rounded p-1 -m-1 transition-colors"
                  >
                    <div className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate" title={getHouseName(resident.houseId)}>
                      {getHouseName(resident.houseId)}
                    </div>
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(resident.status || 'Draft')}`}>
                    {resident.status || 'Draft'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {resident.phone || '-'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {resident.email || '-'}
                  </div>
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
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {true && (
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
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
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
    </>
  )
}