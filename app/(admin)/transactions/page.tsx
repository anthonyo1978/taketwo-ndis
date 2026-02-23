"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { TransactionsTable } from "components/transactions/TransactionsTable"
import { TransactionAdvancedFilters } from "components/transactions/TransactionAdvancedFilters"
import { UnifiedTransactionModal } from "components/transactions/UnifiedTransactionModal"
import { Button } from "components/Button/Button"
import { type TransactionFilters as TxFilters, type TransactionStatus } from "types/transaction"
import type { HouseExpense } from "types/house-expense"
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
  EXPENSE_FREQUENCY_LABELS,
  type ExpenseStatus,
  type ExpenseScope,
} from "types/house-expense"

type ViewMode = 'all' | 'income' | 'property_expenses' | 'org_expenses'

const STATUS_COLORS: Record<ExpenseStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-400',
}

const SCOPE_ICONS: Record<string, string> = {
  property: '🏠',
  organisation: '🏢',
}

/**
 * Parse URL search params into TransactionFilters.
 */
function parseUrlFilters(searchParams: URLSearchParams): { filters: TxFilters; viewMode?: ViewMode } {
  const filters: TxFilters = {}

  const residentId = searchParams.get('residentId')
  const residentIds = searchParams.get('residentIds')
  if (residentId) filters.residentIds = [residentId]
  else if (residentIds) filters.residentIds = residentIds.split(',').filter(Boolean)

  const houseId = searchParams.get('houseId')
  const houseIds = searchParams.get('houseIds')
  if (houseId) filters.houseIds = [houseId]
  else if (houseIds) filters.houseIds = houseIds.split(',').filter(Boolean)

  const statuses = searchParams.get('statuses') || searchParams.get('status')
  if (statuses) filters.statuses = statuses.split(',').filter(Boolean) as TransactionStatus[]

  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  if (dateFrom || dateTo) {
    filters.dateRange = {
      from: dateFrom ? new Date(dateFrom) : new Date('2020-01-01'),
      to: dateTo ? new Date(dateTo) : new Date(),
    }
  }

  const serviceCode = searchParams.get('serviceCode')
  if (serviceCode) filters.serviceCode = serviceCode

  const search = searchParams.get('search')
  if (search) filters.search = search

  const view = searchParams.get('view') as ViewMode | null
  const validViews: ViewMode[] = ['all', 'income', 'property_expenses', 'org_expenses']
  const viewMode = view && validViews.includes(view) ? view : undefined

  return { filters, viewMode }
}

function serializeFiltersToUrl(filters: TxFilters, viewMode: ViewMode, currentParams: URLSearchParams): string {
  const params = new URLSearchParams()
  const page = currentParams.get('page')
  const pageSize = currentParams.get('pageSize')
  if (page) params.set('page', page)
  if (pageSize) params.set('pageSize', pageSize)
  if (viewMode !== 'all') params.set('view', viewMode)
  if (filters.residentIds?.length) params.set('residentId', filters.residentIds[0] as string)
  if (filters.houseIds?.length) params.set('houseId', filters.houseIds[0] as string)
  if (filters.statuses?.length) params.set('statuses', filters.statuses.join(','))
  if (filters.dateRange?.from) params.set('dateFrom', filters.dateRange.from.toISOString().split('T')[0] as string)
  if (filters.dateRange?.to) params.set('dateTo', filters.dateRange.to.toISOString().split('T')[0] as string)
  if (filters.serviceCode) params.set('serviceCode', filters.serviceCode)
  if (filters.search) params.set('search', filters.search)
  return params.toString()
}

function TransactionsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const [initialParsed] = useState(() => parseUrlFilters(searchParams))
  const [filters, setFilters] = useState<TxFilters>(initialParsed.filters)
  const [viewMode, setViewMode] = useState<ViewMode>(initialParsed.viewMode || 'all')

  // Expense data
  const [expenses, setExpenses] = useState<HouseExpense[]>([])
  const [expensesLoading, setExpensesLoading] = useState(false)

  // Sync filters to URL
  useEffect(() => {
    const url = serializeFiltersToUrl(filters, viewMode, searchParams)
    const currentUrl = searchParams.toString()
    if (url !== currentUrl) {
      router.replace(`?${url}`, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, viewMode])

  // Fetch expenses when view mode includes them
  useEffect(() => {
    if (viewMode === 'all' || viewMode === 'property_expenses' || viewMode === 'org_expenses') {
      fetchExpenses()
    }
  }, [viewMode, refreshTrigger])

  const fetchExpenses = async () => {
    setExpensesLoading(true)
    try {
      const scopeParam = viewMode === 'property_expenses' ? '&scope=property' : viewMode === 'org_expenses' ? '&scope=organisation' : ''
      const response = await fetch(`/api/expenses?pageSize=200${scopeParam}`)
      const result = await response.json() as { success: boolean; data?: HouseExpense[] }
      if (result.success && result.data) {
        setExpenses(result.data)
      }
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setExpensesLoading(false)
    }
  }

  const handleFiltersChange = useCallback((newFilters: TxFilters) => {
    setFilters(newFilters)
  }, [])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount)

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

  // Filter expenses based on view mode
  const filteredExpenses = viewMode === 'property_expenses'
    ? expenses.filter(e => e.scope === 'property')
    : viewMode === 'org_expenses'
      ? expenses.filter(e => e.scope === 'organisation')
      : expenses

  // Summary stats
  const expenseSummary = {
    total: filteredExpenses.filter(e => e.status !== 'cancelled').reduce((sum, e) => sum + e.amount, 0),
    property: filteredExpenses.filter(e => e.scope === 'property' && e.status !== 'cancelled').reduce((sum, e) => sum + e.amount, 0),
    organisation: filteredExpenses.filter(e => e.scope === 'organisation' && e.status !== 'cancelled').reduce((sum, e) => sum + e.amount, 0),
  }

  const hasActiveFilters = Boolean(
    filters.search || filters.residentIds?.length || filters.houseIds?.length ||
    filters.statuses?.length || filters.dateRange || filters.serviceCode
  )

  // Determine default direction for modal based on current view
  const modalDefaultDirection = viewMode === 'income' ? 'income' as const : 'expense' as const
  const modalDefaultScope: ExpenseScope = viewMode === 'org_expenses' ? 'organisation' : 'property'

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-600 mt-1">
              {viewMode === 'income' && 'Income from NDIS contract drawdowns'}
              {viewMode === 'property_expenses' && 'Property-level expenses across your portfolio'}
              {viewMode === 'org_expenses' && 'Organisation-level business expenses'}
              {viewMode === 'all' && 'All income and expense activity across your portfolio'}
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Transaction
          </Button>
        </div>

        {/* ─── Quick Filter Tabs ─── */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-6">
          {([
            { key: 'all' as ViewMode, label: 'All', icon: '📊' },
            { key: 'income' as ViewMode, label: 'Income', icon: '↗' },
            { key: 'property_expenses' as ViewMode, label: 'Property Expenses', icon: '🏠' },
            { key: 'org_expenses' as ViewMode, label: 'Org Expenses', icon: '🏢' },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                viewMode === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Deep-link info banner ─── */}
        {hasActiveFilters && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Filters are active — showing a filtered view. Use the filter bar below to adjust or clear.
          </div>
        )}

        {/* ─── Income Section ─── */}
        {(viewMode === 'income' || viewMode === 'all') && (
          <>
            {viewMode === 'all' && (
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 rounded-full bg-emerald-500" />
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Income — NDIS Drawdowns</h2>
              </div>
            )}

            {/* Advanced Filters (income only) */}
            <div className="mb-4">
              <TransactionAdvancedFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onExport={() => {
                  const params = new URLSearchParams()
                  if (filters.dateRange?.from) params.append('dateFrom', filters.dateRange.from.toISOString())
                  if (filters.dateRange?.to) params.append('dateTo', filters.dateRange.to.toISOString())
                  if (filters.statuses?.length) params.append('statuses', filters.statuses.join(','))
                  if (filters.search) params.append('search', filters.search)
                  if (filters.residentIds?.length) params.append('residentIds', filters.residentIds.join(','))
                  if (filters.houseIds?.length) params.append('houseIds', filters.houseIds.join(','))
                  window.open(`/api/transactions/export?${params}`, '_blank')
                }}
              />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 mb-8">
              <TransactionsTable
                filters={filters}
                onCreateTransaction={() => setShowCreateModal(true)}
                refreshTrigger={refreshTrigger}
                showIncomeAccent={viewMode === 'all'}
              />
            </div>
          </>
        )}

        {/* ─── Expenses Section ─── */}
        {(viewMode === 'property_expenses' || viewMode === 'org_expenses' || viewMode === 'all') && (
          <>
            {viewMode === 'all' && (
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 rounded-full bg-rose-400" />
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Expenses — Business Outgoings</h2>
              </div>
            )}

            {/* Expense Summary Cards */}
            {filteredExpenses.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Expenses</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(expenseSummary.total)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">🏠 Property</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(expenseSummary.property)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">🏢 Organisation</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(expenseSummary.organisation)}</p>
                </div>
              </div>
            )}

            {/* Expenses Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8">
              {expensesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                  <p className="ml-2 text-sm text-gray-400">Loading expenses…</p>
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="py-12 text-center">
                  <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses recorded</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Click &quot;Add Transaction&quot; to create your first expense.
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-1 px-0 py-3"></th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scope</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredExpenses.map((expense) => (
                      <tr
                        key={expense.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => expense.houseId ? router.push(`/houses/${expense.houseId}`) : undefined}
                      >
                        {/* Accent bar */}
                        <td className="w-1 px-0 py-0">
                          <div className={`w-1 h-full min-h-[48px] rounded-r ${expense.scope === 'organisation' ? 'bg-purple-400' : 'bg-rose-400'}`} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {formatDate(expense.occurredAt)}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            expense.scope === 'organisation'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {SCOPE_ICONS[expense.scope || 'property']} {expense.scope === 'organisation' ? 'Org' : 'Property'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                          {expense.houseName || (expense.scope === 'organisation' ? '—' : 'Unknown')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                          {EXPENSE_CATEGORY_LABELS[expense.category] || expense.category}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-[250px] truncate">
                          {expense.description}
                          {expense.supplier && (
                            <span className="text-xs text-gray-400 ml-1.5">({expense.supplier})</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-rose-600 text-right whitespace-nowrap">
                          -{formatCurrency(expense.amount)}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[expense.status]}`}>
                            {EXPENSE_STATUS_LABELS[expense.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* Unified Transaction Modal */}
        <UnifiedTransactionModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            setRefreshTrigger(prev => prev + 1)
          }}
          defaultDirection={modalDefaultDirection}
          defaultScope={modalDefaultScope}
        />
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
              <p className="text-gray-600 mt-1">All income and expense activity across your portfolio</p>
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
