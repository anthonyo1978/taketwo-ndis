"use client"

import { useState, Suspense } from "react"
import { TransactionsTable } from "components/transactions/TransactionsTable"
import { StandardizedFiltersTransactions } from "components/ui/StandardizedFiltersTransactions"
import { CreateTransactionDialog } from "components/transactions/CreateTransactionDialog"
import { Button } from "components/Button/Button"
import { type TransactionFilters as TxFilters } from "types/transaction"

function TransactionsPageContent() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [filters, setFilters] = useState<TxFilters>({})
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-600 mt-1">Manage billing transactions and contract drawdowns</p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Transaction
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="mb-6">
          <StandardizedFiltersTransactions
            filters={filters}
            onFiltersChange={setFilters}
            onSearchSubmit={(searchValue) => {
              // Handle search submit if needed
              console.log('Search submitted:', searchValue)
            }}
            onExport={() => {
              // Handle export - open export URL with current filters
              const params = new URLSearchParams()
              if (filters.dateRange?.from) {
                params.append('dateFrom', filters.dateRange.from.toISOString())
              }
              if (filters.dateRange?.to) {
                params.append('dateTo', filters.dateRange.to.toISOString())
              }
              if (filters.statuses && filters.statuses.length > 0) {
                params.append('statuses', filters.statuses.join(','))
              }
              if (filters.search) {
                params.append('search', filters.search)
              }
              window.open(`/api/transactions/export?${params}`, '_blank')
            }}
          />
        </div>
        
        {/* Transactions Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <TransactionsTable 
            filters={filters}
            onCreateTransaction={() => setShowCreateDialog(true)}
            refreshTrigger={refreshTrigger}
          />
        </div>
        
        {/* Create Transaction Dialog */}
        {showCreateDialog && (
          <CreateTransactionDialog
            onClose={() => setShowCreateDialog(false)}
            onSuccess={() => {
              setShowCreateDialog(false)
              // Trigger refresh of the transactions table
              setRefreshTrigger(prev => prev + 1)
            }}
          />
        )}

      </div>
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
              <p className="text-gray-600 mt-1">Manage billing transactions and contract drawdowns</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-gray-600">Loading transactions...</div>
          </div>
        </div>
      </div>
    }>
      <TransactionsPageContent />
    </Suspense>
  )
}