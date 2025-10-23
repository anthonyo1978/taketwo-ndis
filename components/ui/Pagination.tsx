"use client"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  showFirstLast?: boolean
  maxVisiblePages?: number
}

/**
 * Pagination component for navigating through paginated data.
 * 
 * @param currentPage - The current active page number
 * @param totalPages - The total number of pages available
 * @param onPageChange - Callback function when page changes
 * @param className - Optional CSS class for styling
 * @returns A React element representing pagination controls
 */
export function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  className = "",
  showFirstLast = true,
  maxVisiblePages = 5
}: PaginationProps) {
  // Always show pagination controls, even for single page
  // if (totalPages <= 1) return null

  const getVisiblePages = () => {
    const delta = Math.floor(maxVisiblePages / 2)
    const range = []
    const rangeWithDots = []

    // Calculate the start and end of the visible range
    let start = Math.max(1, currentPage - delta)
    let end = Math.min(totalPages, currentPage + delta)

    // Adjust range if we're near the beginning or end
    if (currentPage <= delta) {
      end = Math.min(totalPages, maxVisiblePages)
    }
    if (currentPage + delta >= totalPages) {
      start = Math.max(1, totalPages - maxVisiblePages + 1)
    }

    // Build the range of visible pages
    for (let i = start; i <= end; i++) {
      range.push(i)
    }

    // Add first page and dots if needed
    if (start > 1) {
      rangeWithDots.push(1)
      if (start > 2) {
        rangeWithDots.push('...')
      }
    }

    rangeWithDots.push(...range)

    // Add dots and last page if needed
    if (end < totalPages) {
      if (end < totalPages - 1) {
        rangeWithDots.push('...')
      }
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }

  const visiblePages = getVisiblePages()

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* First Page Button */}
      {showFirstLast && currentPage > 1 && (
        <button
          onClick={() => onPageChange(1)}
          className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          title="First page"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || totalPages <= 1}
        className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
        title="Previous page"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Page Numbers */}
      {visiblePages.map((page, index) => (
        <button
          key={index}
          onClick={() => typeof page === 'number' && onPageChange(page)}
          disabled={page === '...'}
          className={`relative inline-flex items-center px-3 py-2 text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            page === currentPage
              ? 'z-10 bg-blue-600 border-blue-600 text-white shadow-sm'
              : page === '...'
              ? 'text-gray-400 cursor-default border-transparent'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          } rounded-md`}
          title={typeof page === 'number' ? `Page ${page}` : undefined}
        >
          {page}
        </button>
      ))}

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || totalPages <= 1}
        className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
        title="Next page"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Last Page Button */}
      {showFirstLast && currentPage < totalPages && (
        <button
          onClick={() => onPageChange(totalPages)}
          className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          title="Last page"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}
