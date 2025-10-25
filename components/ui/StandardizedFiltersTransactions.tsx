"use client"

import { useState, useEffect } from "react"
import type { TransactionFilters as TxFilters } from "types/transaction"
import { getResidentsFromStorage } from "lib/utils/resident-storage"
import { getHousesFromStorage } from "lib/utils/house-storage"

interface StandardizedFiltersTransactionsProps {
  filters: TxFilters
  onFiltersChange: (filters: TxFilters) => void
  onSearchSubmit?: (searchValue: string) => void
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

const DELIVERY_DATE_OPTIONS = [
  { value: '', label: 'All Time' },
  { value: '7', label: 'Last 7 days' },
  { value: '15', label: 'Last 15 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' }
]

export function StandardizedFiltersTransactions({
  filters,
  onFiltersChange,
  onSearchSubmit,
  className = ""
}: StandardizedFiltersTransactionsProps) {
  const [localFilters, setLocalFilters] = useState<TxFilters>(filters)
  const [searchValue, setSearchValue] = useState('')
  const [residents] = useState(() => getResidentsFromStorage())
  const [houses] = useState(() => getHousesFromStorage())

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
    
    const daysAgo = parseInt(value)
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - daysAgo)
    
    handleFilterChange('dateRange', { from: fromDate, to: new Date() })
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
            placeholder="Search transaction ID, resident, house..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onSearchSubmit) {
                const target = e.target as HTMLInputElement
                handleSearchSubmit(target.value)
              }
            }}
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Filter Dropdowns - Remaining space */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Delivery Date Filter */}
          <div className="w-full sm:w-[120px]">
            <select
              value={localFilters.dateRange ? 
                Math.ceil((new Date().getTime() - localFilters.dateRange.from.getTime()) / (1000 * 60 * 60 * 24)).toString() : ''}
              onChange={(e) => handleDeliveryDateChange(e.target.value)}
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {DELIVERY_DATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-[120px]">
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

          {/* Resident Filter */}
          <div className="w-full sm:w-[150px]">
            <select
              value={localFilters.residentIds?.[0] || ''}
              onChange={(e) => 
                handleFilterChange('residentIds', e.target.value ? [e.target.value] : undefined)
              }
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">All Residents</option>
              {residents.map(resident => (
                <option key={resident.id} value={resident.id}>
                  {resident.firstName} {resident.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* House Filter */}
          <div className="w-full sm:w-[150px]">
            <select
              value={localFilters.houseIds?.[0] || ''}
              onChange={(e) => 
                handleFilterChange('houseIds', e.target.value ? [e.target.value] : undefined)
              }
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">All Houses</option>
              {houses.map(house => (
                <option key={house.id} value={house.id}>
                  {house.descriptor || 'House'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}