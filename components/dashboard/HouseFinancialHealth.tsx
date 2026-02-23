"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'

/* ───── Types ───── */
interface HouseFinancial {
  houseId: string
  houseName: string
  income: number
  expenses: number
  net: number
  grossProfit?: number
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
export function HouseFinancialHealth() {
  const [houses, setHouses] = useState<HouseFinancial[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'net' | 'income' | 'expenses'>('net')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/financials?months=12')
      const json = await res.json() as { success: boolean; data?: { byHouse: HouseFinancial[] } }
      if (json.success && json.data?.byHouse) {
        setHouses(json.data.byHouse)
      }
    } catch (err) {
      console.error('Error fetching house financials:', err)
    } finally {
      setLoading(false)
    }
  }

  const sorted = [...houses].sort((a, b) => {
    if (sortBy === 'net') return b.net - a.net
    if (sortBy === 'income') return b.income - a.income
    return b.expenses - a.expenses
  })

  // Calculate max values for bar widths
  const maxIncome = Math.max(...houses.map(h => h.income), 1)
  const maxExpenses = Math.max(...houses.map(h => h.expenses), 1)
  const maxVal = Math.max(maxIncome, maxExpenses)

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-56 animate-pulse" />
        </div>
        <div className="p-6 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Property Gross Profit</h3>
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          {([
            { key: 'net', label: 'Net' },
            { key: 'income', label: 'Income' },
            { key: 'expenses', label: 'Expenses' },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                sortBy === opt.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* House list */}
      <div className="divide-y divide-gray-100">
        {sorted.length > 0 ? (
          sorted.map((house) => {
            const incomeWidth = maxVal > 0 ? (house.income / maxVal) * 100 : 0
            const expenseWidth = maxVal > 0 ? (house.expenses / maxVal) * 100 : 0
            const isPositive = house.net >= 0

            return (
              <Link
                key={house.houseId}
                href={`/houses/${house.houseId}`}
                className="block px-6 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{house.houseName}</span>
                  <span className={`text-sm font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isPositive ? '+' : ''}{fmtCurrency(house.grossProfit ?? house.net)}
                  </span>
                </div>
                {/* Mini stacked bars */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 w-6 text-right">In</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all"
                        style={{ width: `${Math.max(incomeWidth, 0.5)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 w-16 text-right">{fmtCurrency(house.income)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 w-6 text-right">Out</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-400 rounded-full transition-all"
                        style={{ width: `${Math.max(expenseWidth, 0.5)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 w-16 text-right">{fmtCurrency(house.expenses)}</span>
                  </div>
                </div>
              </Link>
            )
          })
        ) : (
          <div className="px-6 py-12 text-center">
            <div className="text-4xl mb-2">🏠</div>
            <p className="text-gray-500 text-sm">No houses with financial data</p>
          </div>
        )}
      </div>

      {sorted.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500">Showing last 12 months · Gross Profit = Income – Property Expenses</p>
        </div>
      )}
    </div>
  )
}

