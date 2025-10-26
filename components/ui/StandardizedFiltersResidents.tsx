"use client"

interface StandardizedFiltersResidentsProps {
  searchValue: string
  onSearchChange: (value: string) => void
  onSearchSubmit?: (value: string) => void
  statusValue: string
  onStatusChange: (value: string) => void
  dateRangeValue: string
  onDateRangeChange: (value: string) => void
  onImport?: () => void
  onExport?: () => void
  className?: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'Prospect', label: 'Prospect' },
  { value: 'Active', label: 'Active' },
  { value: 'Deactivated', label: 'Deactivated' }
]

const DATE_RANGE_OPTIONS = [
  { value: '', label: 'All Time' },
  { value: '15', label: 'Last 15 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' }
]

/**
 * Standardized filter component for residents page.
 * Provides consistent search, status filtering, date range, and action buttons.
 */
export function StandardizedFiltersResidents({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  statusValue,
  onStatusChange,
  dateRangeValue,
  onDateRangeChange,
  onImport,
  onExport,
  className = ""
}: StandardizedFiltersResidentsProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Bar - 50% of available width */}
        <div className="relative" style={{ width: '50%' }}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search names, NDIS ID, email, phone..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onSearchSubmit) {
                const target = e.target as HTMLInputElement
                onSearchSubmit(target.value)
              }
            }}
            className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          {/* Clear button - only show when search has text */}
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              title="Clear search"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter Dropdowns - Remaining 50% space */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Status Dropdown */}
          <div className="w-full sm:w-[100px]">
            <select
              value={statusValue}
              onChange={(e) => onStatusChange(e.target.value)}
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Dropdown */}
          <div className="w-full sm:w-[100px]">
            <select
              value={dateRangeValue}
              onChange={(e) => onDateRangeChange(e.target.value)}
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 ml-auto">
            {/* Import Button */}
            {onImport && (
              <div className="relative group">
                <button
                  onClick={onImport}
                  className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </button>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                  <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                    Import
                  </div>
                  <div className="w-2 h-2 bg-gray-900 transform rotate-45 absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2"></div>
                </div>
              </div>
            )}
            
            {/* Export Button */}
            {onExport && (
              <div className="relative group">
                <button
                  onClick={onExport}
                  className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                  <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                    Export
                  </div>
                  <div className="w-2 h-2 bg-gray-900 transform rotate-45 absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

