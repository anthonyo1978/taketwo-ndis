"use client"

import { useState, useEffect } from "react"
import type { TransactionFilters as TxFilters } from "types/transaction"

interface StandardizedFiltersTransactionsProps {
  filters: TxFilters
  onFiltersChange: (filters: TxFilters) => void
  onSearchSubmit?: (searchValue: string) => void
  onImport?: () => void
  onExport?: () => void
  className?: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'picked_up', label: 'Picked Up' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'paid', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'error', label: 'Error' }
]

export function StandardizedFiltersTransactions({
  filters,
  onFiltersChange,
  onSearchSubmit,
  onImport,
  onExport,
  className = ""
}: StandardizedFiltersTransactionsProps) {
  const [localFilters, setLocalFilters] = useState<TxFilters>(filters)
  const [searchValue, setSearchValue] = useState('')

  // Update local filters when external filters change
  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleFilterChange = (key: keyof TxFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    // Update search filter immediately for real-time filtering
    handleFilterChange('search', value || undefined)
  }

  const handleSearchSubmit = (value: string) => {
    if (onSearchSubmit) {
      onSearchSubmit(value)
    }
  }

  const handleDeliveryDateChange = (value: string) => {
    if (!value) {
      handleFilterChange('dateRange', undefined)
      return
    }
    
    const selectedDate = new Date(value)
    handleFilterChange('dateRange', { from: selectedDate, to: selectedDate })
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Bar - Takes more space like Houses/Residents */}
        <div className="flex-1 relative max-w-[50%]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search resident by first name or last"
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onSearchSubmit) {
                const target = e.target as HTMLInputElement
                handleSearchSubmit(target.value)
              }
            }}
            className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          {/* Clear button - only show when search has text */}
          {searchValue && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              title="Clear search"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter Dropdowns - Remaining space, spread equally */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Delivery Date Filter */}
          <div className="w-full sm:flex-1 relative">
            <input
              type="date"
              value={localFilters.dateRange?.from ? 
                localFilters.dateRange.from.toISOString().split('T')[0] : ''}
              onChange={(e) => handleDeliveryDateChange(e.target.value)}
              max={new Date().toISOString().split('T')[0]} // Prevent future dates
              className="block w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {/* Clear button - only show when date is selected */}
            {localFilters.dateRange?.from && (
              <button
                onClick={() => handleDeliveryDateChange('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                title="Clear date filter"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="w-full sm:flex-1">
            <select
              value={localFilters.statuses?.[0] || ''}
              onChange={(e) => 
                handleFilterChange('statuses', e.target.value ? [e.target.value] : undefined)
              }
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

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
  )
}