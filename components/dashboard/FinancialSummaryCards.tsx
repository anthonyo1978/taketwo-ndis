"use client"

import { useState, useEffect } from 'react'

/* ───── Types ───── */
interface FinancialTotals {
  income: number
  expenses: number
  net: number
}

/* ───── Helpers ───── */
const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)

/* ───── Component ───── */
export function FinancialSummaryCards() {
  const [totals12m, setTotals12m] = useState<FinancialTotals | null>(null)
  const [totals30d, setTotals30d] = useState<FinancialTotals | null>(null)
  const [houseCount, setHouseCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [res12m, res1m] = await Promise.all([
        fetch('/api/dashboard/financials?months=12'),
        fetch('/api/dashboard/financials?months=1'),
      ])
      const [json12m, json1m] = await Promise.all([
        res12m.json() as Promise<{ success: boolean; data?: { totals: FinancialTotals; byHouse: any[] } }>,
        res1m.json() as Promise<{ success: boolean; data?: { totals: FinancialTotals } }>,
      ])

      if (json12m.success && json12m.data) {
        setTotals12m(json12m.data.totals)
        setHouseCount(json12m.data.byHouse?.length || 0)
      }
      if (json1m.success && json1m.data) {
        setTotals30d(json1m.data.totals)
      }
    } catch (err) {
      console.error('Error fetching financial summary:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-20 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-28 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    )
  }

  const t12 = totals12m || { income: 0, expenses: 0, net: 0 }
  const t1 = totals30d || { income: 0, expenses: 0, net: 0 }
  const margin = t12.income > 0 ? ((t12.net / t12.income) * 100) : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Income (12m) */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Income</p>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900">{fmtCurrency(t12.income)}</p>
        <p className="text-xs text-gray-500 mt-1">
          Last 12 months{t1.income > 0 && <> · <span className="text-emerald-600 font-medium">{fmtCurrency(t1.income)}</span> this month</>}
        </p>
      </div>

      {/* Total Expenses (12m) */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Expenses</p>
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900">{fmtCurrency(t12.expenses)}</p>
        <p className="text-xs text-gray-500 mt-1">
          Last 12 months{t1.expenses > 0 && <> · <span className="text-rose-500 font-medium">{fmtCurrency(t1.expenses)}</span> this month</>}
        </p>
      </div>

      {/* Net Profit (12m) */}
      <div className={`rounded-xl border p-5 hover:shadow-md transition-shadow ${
        t12.net >= 0
          ? 'bg-emerald-50/50 border-emerald-200'
          : 'bg-rose-50/50 border-rose-200'
      }`}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Net Profit</p>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            t12.net >= 0 ? 'bg-emerald-100' : 'bg-rose-100'
          }`}>
            <span className="text-sm">{t12.net >= 0 ? '📈' : '📉'}</span>
          </div>
        </div>
        <p className={`text-2xl font-bold ${t12.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
          {t12.net >= 0 ? '+' : ''}{fmtCurrency(t12.net)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {margin.toFixed(1)}% margin · {houseCount} {houseCount === 1 ? 'house' : 'houses'}
        </p>
      </div>

      {/* This Month Net */}
      <div className={`rounded-xl border p-5 hover:shadow-md transition-shadow ${
        t1.net >= 0
          ? 'bg-white border-gray-200'
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">This Month</p>
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <p className={`text-2xl font-bold ${t1.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
          {t1.net >= 0 ? '+' : ''}{fmtCurrency(t1.net)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {fmtCurrency(t1.income)} in · {fmtCurrency(t1.expenses)} out
        </p>
      </div>
    </div>
  )
}

