"use client"

import { useState } from "react"
import { ChevronDown, Download, Search } from "lucide-react"

interface StandardizedFiltersProps {
  searchValue: string
  onSearchChange: (value: string) => void
  onSearchSubmit?: (value: string) => void
  statusValue: string
  onStatusChange: (value: string) => void
  dateRangeValue: string
  onDateRangeChange: (value: string) => void
  onDownload?: () => void
  className?: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'Active', label: 'Active' },
  { value: 'Vacant', label: 'Vacant' },
  { value: 'Under maintenance', label: 'Under maintenance' }
]

const DATE_RANGE_OPTIONS = [
  { value: '', label: 'All Time' },
  { value: '15', label: 'Last 15 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last year' }
]

/**
 * Standardized filter component matching the screenshot design.
 * Features a wide search bar, aligned filter dropdowns, and download button.
 * 
 * @param searchValue - Current search term
 * @param onSearchChange - Callback when search term changes
 * @param statusValue - Current status filter value
 * @param onStatusChange - Callback when status filter changes
 * @param dateRangeValue - Current date range filter value
 * @param onDateRangeChange - Callback when date range filter changes
 * @param onDownload - Optional callback for download action
 * @param className - Optional CSS class for styling
 * @returns A React element representing standardized filter controls
 */
export function StandardizedFilters({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  statusValue,
  onStatusChange,
  dateRangeValue,
  onDateRangeChange,
  onDownload,
  className = ""
}: StandardizedFiltersProps) {
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false)

  const clearFilters = () => {
    onSearchChange('')
    onStatusChange('')
    onDateRangeChange('')
  }

  const hasActiveFilters = searchValue || statusValue || dateRangeValue

  const selectedStatusLabel = STATUS_OPTIONS.find(opt => opt.value === statusValue)?.label || 'All Statuses'
  const selectedDateRangeLabel = DATE_RANGE_OPTIONS.find(opt => opt.value === dateRangeValue)?.label || 'All Time'

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Bar - Wide on left */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search house names, addresses..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onSearchSubmit) {
                // Trigger search on Enter key
                const target = e.target as HTMLInputElement
                onSearchSubmit(target.value)
              }
            }}
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Filter Dropdowns - Aligned to right */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Status Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className="flex items-center justify-between w-full sm:w-40 px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <span className="truncate">{selectedStatusLabel}</span>
              <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
            </button>
            
            {isStatusOpen && (
              <div className="absolute z-10 mt-1 w-full sm:w-40 bg-white border border-gray-300 rounded-lg shadow-lg">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onStatusChange(option.value)
                      setIsStatusOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                      statusValue === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Range Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
              className="flex items-center justify-between w-full sm:w-40 px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <span className="truncate">{selectedDateRangeLabel}</span>
              <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
            </button>
            
            {isDateRangeOpen && (
              <div className="absolute z-10 mt-1 w-full sm:w-40 bg-white border border-gray-300 rounded-lg shadow-lg">
                {DATE_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onDateRangeChange(option.value)
                      setIsDateRangeOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                      dateRangeValue === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Download Button */}
          {onDownload && (
            <button
              onClick={onDownload}
              className="flex items-center justify-center px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Active Filters Indicator */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Active filters:</span>
            {searchValue && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Search: "{searchValue}"
              </span>
            )}
            {statusValue && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Status: {selectedStatusLabel}
              </span>
            )}
            {dateRangeValue && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Date: {selectedDateRangeLabel}
              </span>
            )}
          </div>
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
