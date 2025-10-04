"use client"

import Link from "next/link"
import { useEffect, useState, useCallback, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ResidentAvatars } from "components/residents/ResidentAvatars"
import { Pagination } from "components/ui/Pagination"
import { SearchAndFilter } from "components/ui/SearchAndFilter"
import type { House } from "types/house"

interface ApiResponse {
  success: boolean
  data?: House[]
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

function HousesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Initialize pagination from URL params
  const [pagination, setPagination] = useState({
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10'),
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  
  // Initialize search and filter state from URL params
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  )

  // Debounced search state
  const [debouncedSearch, setDebouncedSearch] = useState(search)

  const fetchHouses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: debouncedSearch,
        status,
        sortBy,
        sortOrder
      })
      
      const response = await fetch(`/api/houses?${params}`)
      const result = await response.json() as ApiResponse
      
      if (result.success && result.data) {
        setHouses(result.data)
        if (result.pagination) {
          setPagination(result.pagination)
        }
      } else {
        setError(result.error || 'Failed to load houses')
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
      console.error('Error fetching houses:', err)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, debouncedSearch, status, sortBy, sortOrder])

  useEffect(() => {
    fetchHouses()
  }, [fetchHouses])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Function to update URL params when pagination or filters change
  const updateUrlParams = (newParams: {
    page?: number
    limit?: number
    search?: string
    status?: string
    sortBy?: string
    sortOrder?: string
  }) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (newParams.page !== undefined) params.set('page', newParams.page.toString())
    if (newParams.limit !== undefined) params.set('limit', newParams.limit.toString())
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

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
    updateUrlParams({ page })
  }

  // Debounce timer ref
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sync debouncedSearch with initial search value
  useEffect(() => {
    setDebouncedSearch(search)
  }, [])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value)
      setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
      updateUrlParams({ search: value, page: 1 })
    }, 500) // 500ms debounce
  }

  const handleStatusChange = (value: string) => {
    setStatus(value)
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
    updateUrlParams({ status: value, page: 1 })
  }

  const handleSortByChange = (value: string) => {
    setSortBy(value)
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
    updateUrlParams({ sortBy: value, page: 1 })
  }

  const handleSortOrderChange = (value: 'asc' | 'desc') => {
    setSortOrder(value)
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
    updateUrlParams({ sortOrder: value, page: 1 })
  }

  const retryFetch = () => {
    fetchHouses()
  }

  // Loading state with skeleton table
  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Houses</h1>
            <Link
              href="/houses/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New House
            </Link>
          </div>
          
          {/* Skeleton Loading Table */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Property Listings</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      House ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resident(s)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[1, 2, 3].map(i => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-1">
                          <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                          <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-12" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state with retry
  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Houses</h1>
            <Link
              href="/houses/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New House
            </Link>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-red-600 text-lg mb-4">{error}</div>
            <button 
              onClick={retryFetch}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (houses.length === 0) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Houses</h1>
            <Link
              href="/houses/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New House
            </Link>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No houses found</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first house.</p>
            <Link 
              href="/houses/new"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create First House
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Success state - dynamic table
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Houses</h1>
          <Link
            href="/houses/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New House
          </Link>
        </div>

        {/* Search and Filter */}
        <div className="mb-6">
          <SearchAndFilter
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
        
        {/* Dynamic Houses Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Property Listings ({pagination.total} total)
              </h2>
              <div className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    House Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resident(s)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {houses.map((house) => (
                  <tr key={house.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {house.imageUrl ? (
                        <img
                          src={house.imageUrl}
                          alt={house.descriptor || `${house.address1}, ${house.suburb}`}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21l4-7 4 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link 
                      href={`/houses/${house.id}`}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      <div className="font-medium">
                        {house.descriptor || `${house.address1}, ${house.suburb}`}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        ID: {house.id}
                      </div>
                    </Link>
                  </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {house.address1}{house.unit && `, ${house.unit}`}
                      </div>
                      <div className="text-sm text-gray-500">
                        {house.suburb}, {house.state} {house.postcode}, {house.country}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        house.status === 'Active' 
                          ? 'bg-green-100 text-green-800'
                          : house.status === 'Vacant'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {house.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ResidentAvatars houseId={house.id} maxDisplay={4} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(house.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link 
                        href={`/houses/${house.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="px-6 py-4 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                {/* Results Info */}
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total.toLocaleString()} houses
                  </div>
                  
                  {/* Page Size Selector */}
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">Show:</label>
                    <select
                      value={pagination.limit}
                      onChange={(e) => {
                        const newLimit = Number(e.target.value)
                        setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }))
                        updateUrlParams({ limit: newLimit, page: 1 })
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
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                  showFirstLast={true}
                  maxVisiblePages={5}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function HousesPage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Houses</h1>
            <Link
              href="/houses/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New House
            </Link>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="text-gray-600">Loading houses...</div>
          </div>
        </div>
      </div>
    }>
      <HousesPageContent />
    </Suspense>
  )
}