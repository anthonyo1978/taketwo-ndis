"use client"

import { useState, useEffect } from 'react'

/* ───── Types ───── */
interface FinancialTotals {
  income: number
  expenses: number
  propertyExpenses: number
  orgExpenses: number
  net: number
  portfolioGrossProfit: number
  netOperatingProfit: number
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

  const defaults: FinancialTotals = { income: 0, expenses: 0, propertyExpenses: 0, orgExpenses: 0, net: 0, portfolioGrossProfit: 0, netOperatingProfit: 0 }
  const t12 = { ...defaults, ...totals12m }
  const t1 = { ...defaults, ...totals30d }
  const margin = t12.income > 0 ? ((t12.netOperatingProfit / t12.income) * 100) : 0

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

      {/* Total Expenses (12m) – split by property vs org */}
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
          <span className="text-rose-500">{fmtCurrency(t12.propertyExpenses)}</span> property · <span className="text-orange-500">{fmtCurrency(t12.orgExpenses)}</span> org
        </p>
      </div>

      {/* Portfolio Gross Profit (Income – Property Expenses) */}
      <div className={`rounded-xl border p-5 hover:shadow-md transition-shadow ${
        t12.portfolioGrossProfit >= 0
          ? 'bg-emerald-50/50 border-emerald-200'
          : 'bg-rose-50/50 border-rose-200'
      }`}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gross Profit</p>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            t12.portfolioGrossProfit >= 0 ? 'bg-emerald-100' : 'bg-rose-100'
          }`}>
            <span className="text-sm">{t12.portfolioGrossProfit >= 0 ? '📈' : '📉'}</span>
          </div>
        </div>
        <p className={`text-2xl font-bold ${t12.portfolioGrossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
          {t12.portfolioGrossProfit >= 0 ? '+' : ''}{fmtCurrency(t12.portfolioGrossProfit)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Income – Property Expenses · {houseCount} {houseCount === 1 ? 'house' : 'houses'}
        </p>
      </div>

      {/* Net Operating Profit (Gross – Org Expenses) */}
      <div className={`rounded-xl border p-5 hover:shadow-md transition-shadow ${
        t12.netOperatingProfit >= 0
          ? 'bg-blue-50/50 border-blue-200'
          : 'bg-rose-50/50 border-rose-200'
      }`}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Net Operating</p>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            t12.netOperatingProfit >= 0 ? 'bg-blue-100' : 'bg-rose-100'
          }`}>
            <svg className={`w-4 h-4 ${t12.netOperatingProfit >= 0 ? 'text-blue-600' : 'text-rose-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <p className={`text-2xl font-bold ${t12.netOperatingProfit >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
          {t12.netOperatingProfit >= 0 ? '+' : ''}{fmtCurrency(t12.netOperatingProfit)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {margin.toFixed(1)}% margin · After org costs
        </p>
      </div>
    </div>
  )
}

