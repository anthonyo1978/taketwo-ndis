"use client"

import { useState, useEffect, useMemo } from "react"
import { format } from "date-fns"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "components/Button/Button"
import { Pagination } from "components/ui/Pagination"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
} from "@tanstack/react-table"
import type { 
  Transaction, 
  TransactionFilters, 
  TransactionListResponse 
} from "types/transaction"
// Removed localStorage imports - now using API calls

interface TransactionsTableProps {
  filters: TransactionFilters
  onCreateTransaction: () => void
  refreshTrigger?: number
}

const columnHelper = createColumnHelper<Transaction & { 
  residentName: string
  houseName: string 
  contractType: string
}>()

export function TransactionsTable({ filters, onCreateTransaction, refreshTrigger }: TransactionsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [data, setData] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'id', desc: true }
  ])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  
  // Initialize pagination from URL params
  const [pagination, setPagination] = useState({
    pageIndex: parseInt(searchParams.get('page') || '1') - 1,
    pageSize: parseInt(searchParams.get('pageSize') || '25'),
  })
  const [totalCount, setTotalCount] = useState(0)
  const [residents, setResidents] = useState<any[]>([])
  const [houses, setHouses] = useState<any[]>([])
  const [lookupLoading, setLookupLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState<Partial<Transaction>>({})
  const [editContractInfo, setEditContractInfo] = useState<any>(null)
  const [editDateConstraints, setEditDateConstraints] = useState<{
    minDate?: string
    maxDate?: string
  }>({})
  const [editDateWarning, setEditDateWarning] = useState<string>('')
  const [auditComment, setAuditComment] = useState<string>('')

  // Function to update URL params when pagination changes
  const updateUrlParams = (newPagination: typeof pagination) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (newPagination.pageIndex + 1).toString())
    params.set('pageSize', newPagination.pageSize.toString())
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  // Create lookup maps
  const residentLookup = useMemo(() => 
    new Map(residents.map(r => [r.id, r])), 
    [residents]
  )
  const houseLookup = useMemo(() => 
    new Map(houses.map(h => [h.id, h])), 
    [houses]
  )
  const contractLookup = useMemo(() => {
    const map = new Map()
    residents.forEach(resident => {
      resident.fundingInformation.forEach(contract => {
        map.set(contract.id, { ...contract, residentId: resident.id })
      })
    })
    return map
  }, [residents])

  // Enhance data with lookup information
  const enhancedData = useMemo(() => {
    return data.map(tx => {
      try {
      const resident = residentLookup.get(tx.residentId)
      const contract = contractLookup.get(tx.contractId)
        const house = resident?.house || (resident ? houseLookup.get(resident.houseId) : null)

      return {
        ...tx,
          residentName: resident ? `${resident.firstName || ''} ${resident.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
        houseName: house?.name || 'Unknown',
          contractType: contract?.type || 'Unknown',
          isOrphaned: tx.isOrphaned || false, // Ensure isOrphaned is always defined
          quantity: tx.quantity || 0,
          unitPrice: tx.unitPrice || 0,
          amount: tx.amount || 0,
          status: tx.status || 'draft',
          serviceCode: tx.serviceCode || ''
        }
      } catch (error) {
        console.error('Error enhancing transaction data:', error, tx)
        return {
          ...tx,
          residentName: 'Unknown',
          houseName: 'Unknown',
          contractType: 'Unknown',
          isOrphaned: false,
          quantity: 0,
          unitPrice: 0,
          amount: 0,
          status: 'draft',
          serviceCode: ''
        }
      }
    })
  }, [data, residentLookup, houseLookup, contractLookup])

  // Fetch lookup data from API
  const fetchLookupData = async () => {
    try {
      setLookupLoading(true)
      
      // Fetch residents and houses in parallel
      const [residentsResponse, housesResponse] = await Promise.all([
        fetch('/api/residents'),
        fetch('/api/houses')
      ])
      
      const residentsResult = await residentsResponse.json()
      const housesResult = await housesResponse.json()
      
      if (residentsResult.success) {
        setResidents(residentsResult.data || [])
      }
      
      if (housesResult.success) {
        setHouses(housesResult.data || [])
      }
    } catch (err) {
      console.error('Error fetching lookup data:', err)
    } finally {
      setLookupLoading(false)
    }
  }

  // Fetch transactions using API
  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError(null)

      // Prepare sort configuration
      const sortConfig = sorting.length > 0 ? {
        field: sorting[0].id as keyof Transaction,
        direction: sorting[0].desc ? 'desc' as const : 'asc' as const
      } : { field: 'id' as keyof Transaction, direction: 'desc' as const }

      // Build query parameters
      const params = new URLSearchParams()
      params.append('page', (pagination.pageIndex + 1).toString())
      params.append('pageSize', pagination.pageSize.toString())
      params.append('sortField', sortConfig.field)
      params.append('sortDirection', sortConfig.direction)

      // Add filters
      if (filters.dateRange?.from) {
        params.append('dateFrom', filters.dateRange.from.toISOString())
      }
      if (filters.dateRange?.to) {
        params.append('dateTo', filters.dateRange.to.toISOString())
      }
      if (filters.residentIds && filters.residentIds.length > 0) {
        params.append('residentIds', filters.residentIds.join(','))
      }
      if (filters.contractIds && filters.contractIds.length > 0) {
        params.append('contractIds', filters.contractIds.join(','))
      }
      if (filters.statuses && filters.statuses.length > 0) {
        params.append('statuses', filters.statuses.join(','))
      }
      if (filters.serviceCode) {
        params.append('serviceCode', filters.serviceCode)
      }
      if (filters.search) {
        params.append('search', filters.search)
      }

      // Fetch from API
      const response = await fetch(`/api/transactions?${params.toString()}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch transactions')
      }

      setData(result.data.transactions)
      setTotalCount(result.data.total)
    } catch (err) {
      setError('Failed to load transactions from API.')
      console.error('Error fetching transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch lookup data on component mount
  useEffect(() => {
    fetchLookupData()
  }, [])

  // Fetch transactions when filters, pagination, or sorting changes
  // Only fetch if lookup data is loaded
  useEffect(() => {
    if (!lookupLoading) {
      fetchTransactions()
    }
  }, [filters, pagination, sorting, lookupLoading])

  // Refresh data when refreshTrigger changes (e.g., after creating a transaction)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchLookupData()
    fetchTransactions()
    }
  }, [refreshTrigger])

  // Table columns - Only showing requested columns in specified order
  const columns = useMemo<ColumnDef<typeof enhancedData[0]>[]>(() => [
    // TXN ID column
    columnHelper.accessor('id', {
      id: 'id',
      header: 'TXN ID',
      cell: (info) => (
        <button
          onClick={() => handleViewTransaction(info.getValue())}
          className="font-mono text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
        >
          {info.getValue()}
        </button>
      ),
      size: 150,
    }),
    // Resident column
    columnHelper.accessor('residentName', {
      id: 'residentName',
      header: 'Resident',
      size: 150,
    }),
    // House column
    columnHelper.accessor('houseName', {
      id: 'houseName',
      header: 'House',
      size: 120,
    }),
    // Service Code column
    columnHelper.accessor('serviceCode', {
      id: 'serviceCode',
      header: 'Service',
      cell: (info) => info.getValue() || 'N/A',
      size: 120,
    }),
    // Quantity column
    columnHelper.accessor('quantity', {
      id: 'quantity',
      header: 'QTY',
      cell: (info) => {
        const value = info.getValue()
        return value ? value.toLocaleString() : '0'
      },
      size: 80,
    }),
    // Unit Price column
    columnHelper.accessor('unitPrice', {
      id: 'unitPrice',
      header: 'Unit Price',
      cell: (info) => {
        const value = info.getValue()
        return value ? `$${value.toFixed(2)}` : '$0.00'
      },
      size: 100,
    }),
    // Amount column
    columnHelper.accessor('amount', {
      id: 'amount',
      header: 'Amount',
      cell: (info) => {
        const value = info.getValue()
        return value ? `$${value.toFixed(2)}` : '$0.00'
      },
      size: 100,
    }),
    // Status column
    columnHelper.accessor('status', {
      id: 'status',
      header: 'Status',
      cell: (info) => {
        const status = info.getValue() || 'draft'
        const isOrphaned = info.row.original.isOrphaned || false
        const colorMap = {
          draft: 'bg-gray-100 text-gray-800',
          posted: 'bg-green-100 text-green-800',
          voided: 'bg-red-100 text-red-800',
        }
        return (
          <div className="flex flex-col gap-1">
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${colorMap[status] || colorMap.draft}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
            {isOrphaned && (
              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Orphaned
              </span>
            )}
          </div>
        )
      },
      size: 100,
    }),
  ], [])

  const table = useReactTable({
    data: enhancedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    state: {
      sorting,
      columnVisibility,
      pagination,
    },
  })

  // Action handlers
  const handleViewTransaction = async (id: string) => {
    try {
      const response = await fetch(`/api/transactions/${id}`)
      const result = await response.json()
      
      if (result.success) {
        setSelectedTransaction(result.data)
        // Set edit form data but exclude the note field (it's read-only)
        const { note, ...editData } = result.data
        setEditFormData(editData)
        setIsEditing(false)
        setShowTransactionModal(true)
      } else {
        setError(result.error || 'Failed to fetch transaction details')
      }
    } catch (err) {
      setError('Failed to fetch transaction details')
      console.error('Error fetching transaction:', err)
    }
  }

  const handleEditTransaction = async () => {
    if (selectedTransaction?.status === 'draft') {
      setIsEditing(true)
      setAuditComment('') // Clear any previous audit comment
      
      // Load contract information for date boundary validation
      if (selectedTransaction.contractId) {
        try {
          const response = await fetch(`/api/residents/${selectedTransaction.residentId}/funding`)
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data) {
              const contract = result.data.find((c: any) => c.id === selectedTransaction.contractId)
              if (contract) {
                setEditContractInfo(contract)
                
                // Set date constraints
                const minDate = contract.startDate ? new Date(contract.startDate).toISOString().split('T')[0] : undefined
                const maxDate = contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : undefined
                setEditDateConstraints({ minDate, maxDate })
                
                // Check if current date is within bounds
                checkEditDateBounds(selectedTransaction.occurredAt, contract)
              }
            }
          }
        } catch (error) {
          console.error('Error loading contract info for edit:', error)
        }
      }
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedTransaction) return

    // Validate audit comment
    if (!auditComment || auditComment.length < 10) {
      alert('Please provide an audit comment explaining the change (minimum 10 characters)')
      return
    }

    try {
      // Determine if transaction is orphaned based on date bounds
      const isOrphaned = editDateWarning.length > 0
      
      // Create timestamp for the audit entry
      const timestamp = new Date().toLocaleString()
      
      // Append the audit comment to the existing note with timestamp
      const existingNote = selectedTransaction.note || ''
      const newNoteEntry = `\n\n[${timestamp}] ${auditComment}`
      const updatedNote = existingNote + newNoteEntry
      
      const updateData = {
        ...editFormData,
        note: updatedNote, // Update the note with appended audit entry
        isOrphaned,
        auditComment // Include the required audit comment
      }

      const response = await fetch(`/api/transactions/${selectedTransaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      const result = await response.json()
      
      if (result.success) {
        setSelectedTransaction(result.data)
        setEditFormData(result.data)
        setIsEditing(false)
        // Clear edit state
        setEditContractInfo(null)
        setEditDateConstraints({})
        setEditDateWarning('')
        // Refresh the transactions list
        fetchTransactions()
      } else {
        setError(result.error || 'Failed to update transaction')
      }
    } catch (err) {
      setError('Failed to update transaction')
      console.error('Error updating transaction:', err)
    }
  }

  const handleCancelEdit = () => {
    if (selectedTransaction) {
      // Reset edit form data but exclude the note field (it's read-only)
      const { note, ...editData } = selectedTransaction
      setEditFormData(editData)
      setIsEditing(false)
      // Clear edit state
      setEditContractInfo(null)
      setEditDateConstraints({})
      setEditDateWarning('')
      setAuditComment('') // Clear audit comment
    }
  }

  const checkEditDateBounds = (date: Date, contract: any) => {
    if (!contract || !date) return
    
    const transactionDate = new Date(date)
    const startDate = contract.startDate ? new Date(contract.startDate) : null
    const endDate = contract.endDate ? new Date(contract.endDate) : null
    
    let warning = ''
    
    if (startDate && transactionDate < startDate) {
      warning = `Date is before contract start date (${startDate.toLocaleDateString()})`
    } else if (endDate && transactionDate > endDate) {
      warning = `Date is after contract end date (${endDate.toLocaleDateString()})`
    }
    
    setEditDateWarning(warning)
  }

  const handleInputChange = (field: string, value: any) => {
    setEditFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      }
      
      // Real-time amount calculation when quantity or unit price changes
      if (field === 'quantity' || field === 'unitPrice') {
        const quantity = field === 'quantity' ? value : prev.quantity || 0
        const unitPrice = field === 'unitPrice' ? value : prev.unitPrice || 0
        newData.amount = quantity * unitPrice
      }
      
      // Check date bounds when date changes
      if (field === 'occurredAt' && editContractInfo) {
        checkEditDateBounds(value, editContractInfo)
      }
      
      return newData
    })
  }

  const handlePostTransaction = async (id: string) => {
    try {
      const response = await fetch(`/api/transactions/${id}/post`, {
        method: 'POST',
      })
      const result = await response.json()
      
      if (result.success) {
        await fetchTransactions() // Refresh the table
      } else {
        setError(result.error || 'Failed to post transaction')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Error posting transaction:', err)
    }
  }

  const handleVoidTransaction = async (id: string) => {
    const reason = window.prompt('Please provide a reason for voiding this transaction:')
    if (!reason) return

    try {
      const response = await fetch(`/api/transactions/${id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      const result = await response.json()
      
      if (result.success) {
        await fetchTransactions() // Refresh the table
      } else {
        setError(result.error || 'Failed to void transaction')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Error voiding transaction:', err)
    }
  }


  // CSV Export
  const handleExport = async () => {
    try {
      const searchParams = new URLSearchParams()
      
      // Add current filters
      if (filters.dateRange) {
        searchParams.set('dateFrom', filters.dateRange.from.toISOString())
        searchParams.set('dateTo', filters.dateRange.to.toISOString())
      }
      // ... add other filters
      
      const selectedRows = table.getFilteredSelectedRowModel().rows
      if (selectedRows.length > 0) {
        const transactionIds = selectedRows.map(row => row.original.id)
        searchParams.set('transactionIds', transactionIds.join(','))
      }

      window.open(`/api/transactions/export?${searchParams}`, '_blank')
    } catch (err) {
      setError('Failed to export transactions')
      console.error('Error exporting transactions:', err)
    }
  }


  if (loading && data.length === 0) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Table Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold">
            Transactions ({totalCount.toLocaleString()})
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="mt-2"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center space-x-1">
                      <span>
                        {header.isPlaceholder
                          ? null
                          : typeof header.column.columnDef.header === 'string'
                          ? header.column.columnDef.header
                          : header.column.columnDef.header?.(header.getContext())}
                      </span>
                      <span className="text-gray-400">
                        {header.column.getIsSorted() === 'desc' 
                          ? '↓' 
                          : header.column.getIsSorted() === 'asc' 
                          ? '↑' 
                          : ''}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {enhancedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <h3 className="text-lg font-medium mb-2">No transactions yet</h3>
                    <p className="text-gray-400 mb-4">Get started by creating your first transaction</p>
                    <Button onClick={onCreateTransaction}>
                      Create Transaction
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    >
                      {typeof cell.column.columnDef.cell === 'function'
                        ? cell.column.columnDef.cell(cell.getContext())
                        : cell.getValue() as React.ReactNode}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            {/* Results Info */}
            <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-700">
            Showing {pagination.pageIndex * pagination.pageSize + 1} to{' '}
            {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalCount)} of{' '}
                {totalCount.toLocaleString()} results
              </div>
              
              {/* Page Size Selector */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Show:</label>
                <select
                  value={pagination.pageSize}
                  onChange={(e) => {
                    const newPageSize = Number(e.target.value)
                    const newPagination = { pageSize: newPageSize, pageIndex: 0 }
                    setPagination(newPagination)
                    updateUrlParams(newPagination)
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
              currentPage={pagination.pageIndex + 1}
              totalPages={Math.ceil(totalCount / pagination.pageSize)}
              onPageChange={(page) => {
                const newPagination = { ...pagination, pageIndex: page - 1 }
                setPagination(newPagination)
                updateUrlParams(newPagination)
              }}
              showFirstLast={true}
              maxVisiblePages={5}
            />
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {showTransactionModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-semibold">Transaction Details</h3>
          <div className="flex items-center space-x-2">
                     {selectedTransaction?.status === 'draft' && !isEditing && (
            <Button
                         onClick={handleEditTransaction}
              variant="outline"
              size="sm"
                       >
                         Edit
                       </Button>
                     )}
                     <button
                       onClick={() => setShowTransactionModal(false)}
                       className="text-gray-400 hover:text-gray-600"
                     >
                       <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                       </svg>
                     </button>
                   </div>
                 </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">TXN ID</label>
                    <p className="text-sm font-mono text-blue-600">{selectedTransaction.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="flex flex-col gap-2">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        selectedTransaction.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        selectedTransaction.status === 'posted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedTransaction.status.charAt(0).toUpperCase() + selectedTransaction.status.slice(1)}
                      </span>
                      {(selectedTransaction.isOrphaned || false) && (
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Orphaned (Outside Contract Date Range)
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Resident</label>
                    <p className="text-sm">{selectedTransaction.residentName || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">House</label>
                    <p className="text-sm">{selectedTransaction.houseName || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Service Code</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.serviceCode || ''}
                        onChange={(e) => handleInputChange('serviceCode', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    ) : (
                      <p className="text-sm">{selectedTransaction.serviceCode || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date of Delivery</label>
                    {isEditing ? (
                      <div>
                        <input
                          type="date"
                          value={editFormData.occurredAt ? new Date(editFormData.occurredAt).toISOString().split('T')[0] : ''}
                          onChange={(e) => handleInputChange('occurredAt', new Date(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          min={editDateConstraints.minDate}
                          max={editDateConstraints.maxDate}
                        />
                        {editDateWarning && (
                          <p className="text-xs text-yellow-600 mt-1">
                            ⚠️ {editDateWarning}
                          </p>
                        )}
                        {editContractInfo && (
                          <p className="text-xs text-gray-500 mt-1">
                            Contract: {editContractInfo.startDate ? new Date(editContractInfo.startDate).toLocaleDateString() : 'No start date'} 
                            {editContractInfo.endDate ? ` - ${new Date(editContractInfo.endDate).toLocaleDateString()}` : ' (Open-ended)'}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm">{new Date(selectedTransaction.occurredAt).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Quantity</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editFormData.quantity || 0}
                        onChange={(e) => handleInputChange('quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      <p className="text-sm">{selectedTransaction.quantity.toLocaleString()}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Unit Price</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editFormData.unitPrice || 0}
                        onChange={(e) => handleInputChange('unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      <p className="text-sm">${selectedTransaction.unitPrice.toFixed(2)}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Amount (Auto-calculated)</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editFormData.amount || 0}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-semibold bg-gray-50"
                        min="0"
                        step="0.01"
                        readOnly
                      />
                    ) : (
                      <p className="text-sm font-semibold">${selectedTransaction.amount.toFixed(2)}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created</label>
                    <p className="text-sm">{new Date(selectedTransaction.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Note</label>
                  <div className="bg-gray-50 p-3 rounded min-h-[60px] max-h-[120px] overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedTransaction.note || 'No note added'}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Note history is read-only. Add new entries using the audit comment below.
                  </p>
                </div>
                
                {/* Audit Comment Field - Only shown when editing */}
                {isEditing && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Add Note Entry <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={auditComment}
                      onChange={(e) => setAuditComment(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      rows={3}
                      placeholder="Add a new note entry explaining the changes made (minimum 10 characters)..."
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {auditComment.length}/10 characters minimum - This will be appended to the note history with a timestamp
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-6 space-x-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                    >
                      Cancel
            </Button>
                    <Button
                      onClick={handleSaveEdit}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Save Changes
                    </Button>
                  </>
                ) : (
            <Button
              variant="outline"
                    onClick={() => setShowTransactionModal(false)}
            >
                    Close
            </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}