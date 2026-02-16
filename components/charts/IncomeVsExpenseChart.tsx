"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

/* ───── Types ───── */
interface MonthData {
  month: string
  label: string
  shortLabel: string
  income: number
  expenses: number
}

interface FinancialData {
  months: MonthData[]
  totals: { income: number; expenses: number; net: number }
}

interface IncomeVsExpenseChartProps {
  houseId: string
  refreshTrigger?: number
  defaultPeriod?: TimePeriod
}

type TimePeriod = '6m' | '12m'

/* ───── Helpers ───── */
const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)

const fmtCurrencyFull = (v: number) =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)

/* ───── Custom Tooltip ───── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  const income = payload.find((p: any) => p.dataKey === 'income')?.value ?? 0
  const expenses = payload.find((p: any) => p.dataKey === 'expenses')?.value ?? 0
  const net = income - expenses

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 min-w-[180px]">
      <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3C50E0]" />
            Income
          </span>
          <span className="text-sm font-medium text-gray-900">{fmtCurrencyFull(income)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-[#80CAEE]" />
            Expenses
          </span>
          <span className="text-sm font-medium text-gray-900">{fmtCurrencyFull(expenses)}</span>
        </div>
        <div className="border-t border-gray-100 pt-1.5 flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-gray-600">Net</span>
          <span className={`text-sm font-semibold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {net >= 0 ? '+' : ''}{fmtCurrencyFull(net)}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ───── Component ───── */
export function IncomeVsExpenseChart({ houseId, refreshTrigger = 0, defaultPeriod = '12m' }: IncomeVsExpenseChartProps) {
  const [data, setData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<TimePeriod>(defaultPeriod)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const months = period === '6m' ? 6 : 12
      const res = await fetch(`/api/houses/${houseId}/financials?months=${months}`)
      const json = await res.json() as { success: boolean; data?: FinancialData; error?: string }
      if (json.success && json.data) {
        setData(json.data)
      } else {
        setError(json.error || 'Failed to load financial data')
      }
    } catch (err) {
      console.error('Error fetching financials:', err)
      setError('Failed to load financial data')
    } finally {
      setLoading(false)
    }
  }, [houseId, period])

  useEffect(() => {
    fetchData()
  }, [fetchData, refreshTrigger])

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="h-5 bg-gray-200 rounded w-48" />
            <div className="flex gap-2">
              <div className="h-8 w-12 bg-gray-200 rounded-lg" />
              <div className="h-8 w-12 bg-gray-200 rounded-lg" />
            </div>
          </div>
          <div className="h-[320px] bg-gray-50 rounded-lg" />
        </div>
      </div>
    )
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  const chartData = data?.months || []
  const totals = data?.totals || { income: 0, expenses: 0, net: 0 }
  const hasData = chartData.some(d => d.income > 0 || d.expenses > 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* ── Header row ── */}
      <div className="px-6 pt-5 pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Left: Legend + summary */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {/* Income legend */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#3C50E0]" />
            <div>
              <p className="text-sm font-medium text-gray-900">Total Income</p>
              <p className="text-xs text-gray-500">
                {fmtCurrency(totals.income)}
              </p>
            </div>
          </div>

          {/* Expenses legend */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#80CAEE]" />
            <div>
              <p className="text-sm font-medium text-gray-900">Total Expenses</p>
              <p className="text-xs text-gray-500">
                {fmtCurrency(totals.expenses)}
              </p>
            </div>
          </div>

          {/* Net */}
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${totals.net >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
            <div>
              <p className="text-sm font-medium text-gray-900">Net</p>
              <p className={`text-xs font-semibold ${totals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totals.net >= 0 ? '+' : ''}{fmtCurrency(totals.net)}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Period toggle */}
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-0.5 self-start sm:self-auto">
          {(['6m', '12m'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === p
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p === '6m' ? '6 Months' : '12 Months'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="px-2 pb-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3C50E0" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3C50E0" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#80CAEE" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#80CAEE" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                vertical={false}
              />

              <XAxis
                dataKey="shortLabel"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                dy={8}
              />

              <YAxis
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                }
                width={55}
              />

              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: '#d1d5db', strokeWidth: 1 }}
              />

              <Area
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="#3C50E0"
                strokeWidth={2}
                fill="url(#incomeGrad)"
                dot={{ r: 3, fill: '#3C50E0', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 5, fill: '#3C50E0', stroke: '#fff', strokeWidth: 2 }}
              />

              <Area
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#80CAEE"
                strokeWidth={2}
                fill="url(#expenseGrad)"
                dot={{ r: 3, fill: '#80CAEE', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 5, fill: '#80CAEE', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[320px] flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              <p className="text-sm font-medium">No financial data yet</p>
              <p className="text-xs mt-1">Income and expenses will appear here once recorded</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

