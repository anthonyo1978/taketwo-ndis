"use client"

import { useState, useEffect } from "react"
import type { TransactionFilters as TxFilters } from "types/transaction"
import { getResidentsFromStorage } from "lib/utils/resident-storage"
import { getHousesFromStorage } from "lib/utils/house-storage"

interface StandardizedFiltersTransactionsProps {
  filters: TxFilters
  onFiltersChange: (filters: TxFilters) => void
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
  className = ""
}: StandardizedFiltersTransactionsProps) {
  const [localFilters, setLocalFilters] = useState<TxFilters>(filters)
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

  const handleDateRangeChange = (field: 'from' | 'to', value: string) => {
    const date = value ? new Date(value) : undefined
    const dateRange = localFilters.dateRange || { from: new Date(), to: new Date() }
    
    const newDateRange = { ...dateRange, [field]: date }
    if (newDateRange.from && newDateRange.to) {
      handleFilterChange('dateRange', newDateRange)
    } else if (!value) {
      handleFilterChange('dateRange', undefined)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Filter Controls - Spread across the width */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* From Date */}
          <div className="w-full sm:w-[140px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={localFilters.dateRange?.from ? 
                localFilters.dateRange.from.toISOString().split('T')[0] : ''}
              onChange={(e) => handleDateRangeChange('from', e.target.value)}
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* To Date */}
          <div className="w-full sm:w-[140px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={localFilters.dateRange?.to ? 
                localFilters.dateRange.to.toISOString().split('T')[0] : ''}
              onChange={(e) => handleDateRangeChange('to', e.target.value)}
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-[120px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Resident</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">House</label>
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