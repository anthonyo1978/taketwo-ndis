"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Pagination } from "components/ui/Pagination"
import type { Transaction } from "types/transaction"

interface ApiResponse {
  success: boolean
  data?: Transaction[]
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

interface ResidentTransactionsListProps {
  residentId: string
}

export function ResidentTransactionsList({ residentId }: ResidentTransactionsListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination state - initialize from URL params
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1', 10))
  const [pageSize, setPageSize] = useState(parseInt(searchParams.get('pageSize') || '10', 10))
  const [totalPages, setTotalPages] = useState(0)
  const [totalTransactions, setTotalTransactions] = useState(0)

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)
      
      // Build query parameters for transactions API
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        residentIds: residentId, // Filter by this specific resident
        sortField: 'id',
        sortDirection: 'desc'
      })
      
      const response = await fetch(`/api/transactions?${params}`)
      const result = await response.json() as ApiResponse
      
      if (result.success && result.data) {
        setTransactions(result.data)
        if (result.pagination) {
          setTotalPages(result.pagination.totalPages)
          setTotalTransactions(result.pagination.total)
        }
      } else {
        setError(result.error || 'Failed to load transactions')
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
      console.error('Error fetching transactions:', err)
    } finally {
      setLoading(false)
    }
  }, [residentId, currentPage, pageSize])

  // Function to update URL params when pagination changes
  const updateUrlParams = (newParams: {
    page?: number
    pageSize?: number
  }) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (newParams.page !== undefined) params.set('page', newParams.page.toString())
    if (newParams.pageSize !== undefined) params.set('pageSize', newParams.pageSize.toString())
    
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    updateUrlParams({ page })
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1) // Reset to first page
    updateUrlParams({ page: 1, pageSize: newPageSize })
  }

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  // Format date
  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
    
    switch (status) {
      case 'draft':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'posted':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'voided':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-48" />
          <div className="h-8 bg-gray-200 rounded animate-pulse w-32" />
        </div>
        
        {/* Table skeleton */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="p-4 border-b">
            <div className="grid grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-4 border-b last:border-b-0">
              <div className="grid grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map(j => (
                  <div key={j} className="h-4 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 text-lg mb-4">{error}</div>
        <button 
          onClick={fetchTransactions}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Transactions ({totalTransactions})
        </h3>
        
        {/* Page size selector */}
        <div className="flex items-center space-x-2">
          <label htmlFor="pageSize" className="text-sm text-gray-600">
            Show:
          </label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-lg mb-2">No transactions found</div>
            <div className="text-sm">This resident has no transactions yet.</div>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="bg-gray-50 px-4 py-3 border-b">
              <div className="grid grid-cols-6 gap-4 text-sm font-medium text-gray-700">
                <div>TXN ID</div>
                <div>Service</div>
                <div>Date</div>
                <div>Qty</div>
                <div>Amount</div>
                <div>Status</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="grid grid-cols-6 gap-4 text-sm">
                    <div className="font-mono text-blue-600">
                      {transaction.id}
                    </div>
                    <div className="text-gray-900">
                      {transaction.serviceCode || 'N/A'}
                    </div>
                    <div className="text-gray-900">
                      {formatDate(transaction.occurredAt)}
                    </div>
                    <div className="text-gray-900">
                      {transaction.quantity}
                    </div>
                    <div className="text-gray-900 font-medium">
                      {formatCurrency(transaction.amount)}
                    </div>
                    <div>
                      <span className={getStatusBadge(transaction.status)}>
                        {transaction.status}
                      </span>
                      {transaction.isOrphaned && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          Orphaned
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalTransactions)} of {totalTransactions} transactions
          </div>
          
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            showFirstLast={false}
            maxVisiblePages={5}
          />
        </div>
      )}
    </div>
  )
}
