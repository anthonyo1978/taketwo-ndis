"use client"

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import type { HouseExpense } from 'types/house-expense'
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_FREQUENCY_LABELS,
  EXPENSE_STATUS_LABELS,
  type ExpenseStatus,
} from 'types/house-expense'

interface HouseExpensesListProps {
  houseId: string
  refreshTrigger?: number
  onAddExpense: () => void
  /** If set, only show expenses matching this category */
  filterCategory?: string
  /** If true, hide the header bar with title + New Expense button */
  hideHeader?: boolean
}

const STATUS_COLORS: Record<ExpenseStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-400 line-through',
}

const CATEGORY_ICONS: Record<string, string> = {
  rent: '🏠',
  maintenance: '🔧',
  insurance: '🛡️',
  utilities: '⚡',
  rates: '📋',
  management_fee: '💼',
  other: '📄',
}

export function HouseExpensesList({ houseId, refreshTrigger = 0, onAddExpense, filterCategory, hideHeader }: HouseExpensesListProps) {
  const [expenses, setExpenses] = useState<HouseExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [totalExpenses, setTotalExpenses] = useState(0)

  useEffect(() => {
    fetchExpenses()
  }, [houseId, refreshTrigger, filterCategory])

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterCategory) params.set('category', filterCategory)
      const url = `/api/houses/${houseId}/expenses${params.toString() ? `?${params}` : ''}`
      const response = await fetch(url)
      const result = await response.json() as { success: boolean; data?: HouseExpense[] }
      if (result.success && result.data) {
        setExpenses(result.data)
        const total = result.data
          .filter(e => e.status !== 'cancelled')
          .reduce((sum, e) => sum + e.amount, 0)
        setTotalExpenses(total)
      }
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (expenseId: string, newStatus: ExpenseStatus) => {
    try {
      const body: any = { status: newStatus }
      if (newStatus === 'paid') {
        body.paidAt = new Date().toISOString()
      }

      const response = await fetch(`/api/house-expenses/${expenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json() as { success: boolean }
      if (result.success) {
        toast.success(`Expense marked as ${EXPENSE_STATUS_LABELS[newStatus]}`)
        fetchExpenses()
      }
    } catch (error) {
      console.error('Error updating expense:', error)
      toast.error('Failed to update expense')
    }
  }

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Delete this expense? This cannot be undone.')) return
    try {
      const response = await fetch(`/api/house-expenses/${expenseId}`, { method: 'DELETE' })
      const result = await response.json() as { success: boolean }
      if (result.success) {
        toast.success('Expense deleted')
        fetchExpenses()
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
      toast.error('Failed to delete expense')
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount)

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        <p className="ml-2 text-sm text-gray-400">Loading expenses…</p>
      </div>
    )
  }

  return (
    <div>
      {/* Summary bar */}
      {!hideHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-base font-semibold text-gray-900">Expenses</h3>
            {expenses.length > 0 && (
              <span className="text-sm text-gray-500">
                {expenses.length} transaction{expenses.length !== 1 ? 's' : ''} · Total: <strong className="text-gray-900">{formatCurrency(totalExpenses)}</strong>
              </span>
            )}
          </div>
          <button
            onClick={onAddExpense}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 text-sm font-medium"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Expense
          </button>
        </div>
      )}
      {hideHeader && expenses.length > 0 && (
        <div className="mb-3">
          <span className="text-sm text-gray-500">
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} · Total: <strong className="text-gray-900">{formatCurrency(totalExpenses)}</strong>
          </span>
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first expense to start tracking outgoings for this house.
          </p>
          <button
            onClick={onAddExpense}
            className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Create first expense →
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((expense) => {
                const isSnapshot = expense.isSnapshot
                return (
                  <tr
                    key={expense.id}
                    className={`transition-colors ${isSnapshot ? 'bg-teal-50/40 hover:bg-teal-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {isSnapshot && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" title="Snapshot / Reading" />
                        )}
                        {formatDate(expense.occurredAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span>{CATEGORY_ICONS[expense.category] || '📄'}</span>
                        {EXPENSE_CATEGORY_LABELS[expense.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px]">
                      <div className="truncate">
                        {expense.description}
                        {expense.reference && (
                          <span className="text-xs text-gray-400 ml-1.5">({expense.reference})</span>
                        )}
                      </div>
                      {isSnapshot && expense.meterReading != null && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded">
                            📊 {expense.meterReading.toLocaleString()}{expense.readingUnit ? ` ${expense.readingUnit}` : ''}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {expense.frequency ? EXPENSE_FREQUENCY_LABELS[expense.frequency] : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right whitespace-nowrap">
                      {expense.amount === 0 && isSnapshot ? (
                        <span className="text-teal-600 text-xs font-medium">Reading only</span>
                      ) : (
                        <span className="text-gray-900">{formatCurrency(expense.amount)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {isSnapshot ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                          Snapshot
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[expense.status]}`}>
                          {EXPENSE_STATUS_LABELS[expense.status]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {!isSnapshot && expense.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(expense.id, 'approved')}
                            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                            title="Approve"
                          >
                            Approve
                          </button>
                        )}
                        {!isSnapshot && (expense.status === 'draft' || expense.status === 'approved') && (
                          <button
                            onClick={() => handleStatusChange(expense.id, 'paid')}
                            className="text-xs text-green-600 hover:text-green-800 px-2 py-1 rounded hover:bg-green-50 transition-colors"
                            title="Mark as Paid"
                          >
                            Pay
                          </button>
                        )}
                        {(isSnapshot || (expense.status !== 'cancelled' && expense.status !== 'paid')) && (
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

