"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { TransactionFilters as TxFilters, TransactionStatus } from "types/transaction"

/* ───── Types ───── */
interface FilterOption {
  value: string
  label: string
}

interface TransactionAdvancedFiltersProps {
  filters: TxFilters
  onFiltersChange: (filters: TxFilters) => void
  onExport?: () => void
  className?: string
}

/* ───── Constants ───── */
const STATUS_OPTIONS: FilterOption[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'picked_up', label: 'Picked Up' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'paid', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'error', label: 'Error' },
]

const SERVICE_CODE_OPTIONS: FilterOption[] = [
  { value: 'SDA_RENT', label: 'SDA Rent' },
  { value: 'SIL_SUPPORT', label: 'SIL Support' },
  { value: 'CORE_SUPPORT', label: 'Core Support' },
  { value: 'CAPACITY_BUILDING', label: 'Capacity Building' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'THERAPY', label: 'Therapy' },
  { value: 'RESPITE', label: 'Respite' },
  { value: 'OTHER', label: 'Other' },
]

/* ───── Helpers ───── */
function formatDateForInput(date: Date | undefined): string {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0] || ''
}

/* ───── Component ───── */
export function TransactionAdvancedFilters({
  filters,
  onFiltersChange,
  onExport,
  className = "",
}: TransactionAdvancedFiltersProps) {
  // Lookup data
  const [residents, setResidents] = useState<FilterOption[]>([])
  const [houses, setHouses] = useState<FilterOption[]>([])
  const [lookupLoading, setLookupLoading] = useState(true)

  // Local UI state
  const [search, setSearch] = useState(filters.search || '')
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  // Fetch lookup data on mount
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [resRes, houseRes] = await Promise.all([
          fetch('/api/residents'),
          fetch('/api/houses'),
        ])
        const resData = await resRes.json() as { success: boolean; data?: any[] }
        const houseData = await houseRes.json() as { success: boolean; data?: any[] }

        if (resData.success && resData.data) {
          setResidents(
            resData.data
              .filter((r: any) => r.id && (r.firstName || r.lastName))
              .map((r: any) => ({
                value: r.id,
                label: `${r.firstName || ''} ${r.lastName || ''}`.trim(),
              }))
              .sort((a: FilterOption, b: FilterOption) => a.label.localeCompare(b.label))
          )
        }
        if (houseData.success && houseData.data) {
          setHouses(
            houseData.data
              .filter((h: any) => h.id && h.descriptor)
              .map((h: any) => ({
                value: h.id,
                label: h.descriptor,
              }))
              .sort((a: FilterOption, b: FilterOption) => a.label.localeCompare(b.label))
          )
        }
      } catch (err) {
        console.error('Error fetching filter lookups:', err)
      } finally {
        setLookupLoading(false)
      }
    }
    fetchLookups()
  }, [])

  // Sync search from external filter changes
  useEffect(() => {
    setSearch(filters.search || '')
  }, [filters.search])

  // Detect if "more" filters are active to auto-expand
  useEffect(() => {
    const hasAdvanced =
      (filters.houseIds && filters.houseIds.length > 0) ||
      filters.serviceCode ||
      (filters.dateRange?.from && filters.dateRange?.to)
    if (hasAdvanced) setShowMoreFilters(true)
  }, [filters])

  /* ── Handlers ── */
  const updateFilter = useCallback(
    (patch: Partial<TxFilters>) => {
      onFiltersChange({ ...filters, ...patch })
    },
    [filters, onFiltersChange]
  )

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      updateFilter({ search: value || undefined })
    }, 300)
  }

  const handleResidentChange = (residentId: string) => {
    updateFilter({
      residentIds: residentId ? [residentId] : undefined,
    })
  }

  const handleHouseChange = (houseId: string) => {
    updateFilter({
      houseIds: houseId ? [houseId] : undefined,
    })
  }

  const handleStatusChange = (status: string) => {
    if (!status) {
      updateFilter({ statuses: undefined })
      return
    }
    const current = filters.statuses || []
    const isSelected = current.includes(status as TransactionStatus)
    const next = isSelected
      ? current.filter((s) => s !== status)
      : [...current, status as TransactionStatus]
    updateFilter({ statuses: next.length > 0 ? next : undefined })
  }

  const handleDateFromChange = (value: string) => {
    if (!value) {
      updateFilter({ dateRange: undefined })
      return
    }
    const from = new Date(value)
    const to = filters.dateRange?.to || new Date()
    updateFilter({ dateRange: { from, to } })
  }

  const handleDateToChange = (value: string) => {
    if (!value) {
      if (filters.dateRange?.from) {
        updateFilter({ dateRange: { from: filters.dateRange.from, to: new Date() } })
      } else {
        updateFilter({ dateRange: undefined })
      }
      return
    }
    const to = new Date(value)
    const from = filters.dateRange?.from || new Date('2020-01-01')
    updateFilter({ dateRange: { from, to } })
  }

  const handleServiceCodeChange = (code: string) => {
    updateFilter({ serviceCode: code || undefined })
  }

  const clearAllFilters = () => {
    setSearch('')
    onFiltersChange({})
  }

  /* ── Active filter count ── */
  const activeFilterCount = [
    filters.search,
    filters.residentIds?.length,
    filters.houseIds?.length,
    filters.statuses?.length,
    filters.dateRange,
    filters.serviceCode,
  ].filter(Boolean).length

  /* ── Active filter pills ── */
  const pills: { label: string; onClear: () => void }[] = []

  if (filters.residentIds?.length) {
    const name = residents.find((r) => r.value === filters.residentIds![0])?.label || 'Resident'
    pills.push({
      label: `Resident: ${name}`,
      onClear: () => updateFilter({ residentIds: undefined }),
    })
  }
  if (filters.houseIds?.length) {
    const name = houses.find((h) => h.value === filters.houseIds![0])?.label || 'House'
    pills.push({
      label: `House: ${name}`,
      onClear: () => updateFilter({ houseIds: undefined }),
    })
  }
  if (filters.statuses?.length) {
    const labels = filters.statuses
      .map((s) => STATUS_OPTIONS.find((o) => o.value === s)?.label || s)
      .join(', ')
    pills.push({
      label: `Status: ${labels}`,
      onClear: () => updateFilter({ statuses: undefined }),
    })
  }
  if (filters.dateRange) {
    const from = filters.dateRange.from.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    const to = filters.dateRange.to.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    pills.push({
      label: `Date: ${from} – ${to}`,
      onClear: () => updateFilter({ dateRange: undefined }),
    })
  }
  if (filters.serviceCode) {
    const label = SERVICE_CODE_OPTIONS.find((o) => o.value === filters.serviceCode)?.label || filters.serviceCode
    pills.push({
      label: `Service: ${label}`,
      onClear: () => updateFilter({ serviceCode: undefined }),
    })
  }
  if (filters.search) {
    pills.push({
      label: `Search: "${filters.search}"`,
      onClear: () => { setSearch(''); updateFilter({ search: undefined }) },
    })
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* ── Row 1: Search + Resident + Status + Toggle ── */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by resident name, note, description…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="block w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          {search && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Resident */}
        <select
          value={filters.residentIds?.[0] || ''}
          onChange={(e) => handleResidentChange(e.target.value)}
          disabled={lookupLoading}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[180px]"
        >
          <option value="">All Residents</option>
          {residents.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        {/* Status */}
        <select
          value={filters.statuses?.length === 1 ? filters.statuses[0] : ''}
          onChange={(e) => {
            const val = e.target.value
            updateFilter({ statuses: val ? [val as TransactionStatus] : undefined })
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[150px]"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* More Filters toggle */}
        <button
          onClick={() => setShowMoreFilters(!showMoreFilters)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            showMoreFilters || activeFilterCount > 2
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          More Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold">
              {activeFilterCount}
            </span>
          )}
          <svg
            className={`h-4 w-4 transition-transform ${showMoreFilters ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Export */}
        {onExport && (
          <button
            onClick={onExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            title="Export"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </button>
        )}
      </div>

      {/* ── Row 2: Expanded filters ── */}
      {showMoreFilters && (
        <div className="flex flex-col lg:flex-row gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          {/* House */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">House</label>
            <select
              value={filters.houseIds?.[0] || ''}
              onChange={(e) => handleHouseChange(e.target.value)}
              disabled={lookupLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Houses</option>
              {houses.map((h) => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Date From</label>
            <input
              type="date"
              value={formatDateForInput(filters.dateRange?.from)}
              onChange={(e) => handleDateFromChange(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date To */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Date To</label>
            <input
              type="date"
              value={formatDateForInput(filters.dateRange?.to)}
              onChange={(e) => handleDateToChange(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Service Code */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Service Code</label>
            <select
              value={filters.serviceCode || ''}
              onChange={(e) => handleServiceCodeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Services</option>
              {SERVICE_CODE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Row 3: Active filter pills ── */}
      {pills.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active filters:</span>
          {pills.map((pill, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-medium text-blue-800"
            >
              {pill.label}
              <button
                onClick={pill.onClear}
                className="ml-0.5 text-blue-500 hover:text-blue-700"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          <button
            onClick={clearAllFilters}
            className="text-xs text-red-600 hover:text-red-800 font-medium underline underline-offset-2"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}

