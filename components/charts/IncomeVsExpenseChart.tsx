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
  ReferenceLine,
} from 'recharts'

/* ───── Types ───── */
interface ResidentBreakdown {
  name: string
  amount: number
}

interface ExpenseBreakdown {
  category: string
  amount: number
  topItem?: string
}

interface MonthData {
  month: string
  label: string
  shortLabel: string
  income: number
  expenses: number
  residentBreakdown?: ResidentBreakdown[]
  expenseBreakdown?: ExpenseBreakdown[]
}

interface FinancialData {
  months: MonthData[]
  totals: { income: number; expenses: number; net: number }
}

interface Milestone {
  date: Date
  label: string
  type: 'go-live' | 'move-in'
}

interface IncomeVsExpenseChartProps {
  houseId: string
  refreshTrigger?: number
  defaultPeriod?: TimePeriod
  milestones?: Milestone[]
}

type TimePeriod = 'all' | '12m' | '6m' | '3m'

const PERIOD_LABELS: Record<TimePeriod, string> = {
  all: 'All Time',
  '12m': '12 Months',
  '6m': '6 Months',
  '3m': '3 Months',
}

const PERIOD_MONTHS: Record<TimePeriod, number> = {
  all: 0,
  '12m': 12,
  '6m': 6,
  '3m': 3,
}

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Rent',
  maintenance: 'Maintenance',
  insurance: 'Insurance',
  utilities: 'Utilities',
  rates: 'Rates',
  management_fee: 'Management Fee',
  other: 'Other',
}

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

/* ───── Simple Tooltip ───── */
function SimpleTooltip({ active, payload, label }: any) {
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

/* ───── Detailed Tooltip ───── */
function DetailedTooltip({ active, payload, label, chartData }: any) {
  if (!active || !payload?.length) return null

  const income = payload.find((p: any) => p.dataKey === 'income')?.value ?? 0
  const expenses = payload.find((p: any) => p.dataKey === 'expenses')?.value ?? 0
  const net = income - expenses

  // Find the full month data to get breakdowns
  const monthData: MonthData | undefined = (chartData || []).find(
    (d: MonthData) => d.label === label || d.shortLabel === label
  )

  const residentBreakdown = monthData?.residentBreakdown || []
  const expenseBreakdown = monthData?.expenseBreakdown || []

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-4 min-w-[280px] max-w-[360px]">
      <p className="text-sm font-bold text-gray-900 mb-3">{monthData?.label || label}</p>

      {/* ── Income section ── */}
      <div className="mb-3">
        <div className="flex items-center justify-between gap-4 mb-1">
          <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3C50E0]" />
            Income
          </span>
          <span className="text-sm font-semibold text-gray-900">{fmtCurrencyFull(income)}</span>
        </div>

        {/* Per-resident breakdown */}
        {residentBreakdown.length > 0 && (
          <div className="ml-4 mt-1 space-y-0.5">
            {residentBreakdown.map((r: ResidentBreakdown, i: number) => {
              const pct = income > 0 ? Math.round((r.amount / income) * 100) : 0
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                    {r.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <span className="text-gray-600 truncate flex-1">{r.name}</span>
                  <span className="text-gray-900 font-medium tabular-nums">{fmtCurrencyFull(r.amount)}</span>
                  <span className="text-gray-400 text-[10px] w-8 text-right">{pct}%</span>
                </div>
              )
            })}
          </div>
        )}
        {residentBreakdown.length === 0 && income > 0 && (
          <p className="ml-4 text-xs text-gray-400 italic">No resident breakdown available</p>
        )}
      </div>

      {/* ── Expenses section ── */}
      <div className="mb-3">
        <div className="flex items-center justify-between gap-4 mb-1">
          <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <span className="w-2.5 h-2.5 rounded-full bg-[#80CAEE]" />
            Expenses
          </span>
          <span className="text-sm font-semibold text-gray-900">{fmtCurrencyFull(expenses)}</span>
        </div>

        {/* Per-category breakdown */}
        {expenseBreakdown.length > 0 && (
          <div className="ml-4 mt-1 space-y-0.5">
            {expenseBreakdown.map((c: ExpenseBreakdown, i: number) => {
              const pct = expenses > 0 ? Math.round((c.amount / expenses) * 100) : 0
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                  <span className="text-gray-600 truncate flex-1">
                    {CATEGORY_LABELS[c.category] || c.category}
                    {c.topItem && c.topItem !== c.category && (
                      <span className="text-gray-400 ml-1">({c.topItem})</span>
                    )}
                  </span>
                  <span className="text-gray-900 font-medium tabular-nums">{fmtCurrencyFull(c.amount)}</span>
                  <span className="text-gray-400 text-[10px] w-8 text-right">{pct}%</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Net ── */}
      <div className="border-t border-gray-100 pt-2 flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-gray-600">Net</span>
        <span className={`text-sm font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {net >= 0 ? '+' : ''}{fmtCurrencyFull(net)}
        </span>
      </div>
    </div>
  )
}

/* ───── Component ───── */
export function IncomeVsExpenseChart({ houseId, refreshTrigger = 0, defaultPeriod = 'all', milestones = [] }: IncomeVsExpenseChartProps) {
  const [data, setData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<TimePeriod>(defaultPeriod)
  const [detailedMode, setDetailedMode] = useState(false)
  const [showMilestones, setShowMilestones] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const months = PERIOD_MONTHS[period]
      const detailParam = detailedMode ? '&detailed=1' : ''
      const res = await fetch(`/api/houses/${houseId}/financials?months=${months}${detailParam}`)
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
  }, [houseId, period, detailedMode])

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
              <div className="h-8 w-16 bg-gray-200 rounded-lg" />
              <div className="h-8 w-12 bg-gray-200 rounded-lg" />
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

  // Map milestones to the chart's shortLabel axis
  const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const milestoneMarkers = milestones.map(m => {
    const d = new Date(m.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const shortLabel = chartData.find(cd => cd.month === key)?.shortLabel
    return shortLabel ? { ...m, shortLabel, monthKey: key } : null
  }).filter(Boolean) as (Milestone & { shortLabel: string; monthKey: string })[]

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* ── Header row ── */}
      <div className="px-6 pt-5 pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Left: Legend + summary */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#3C50E0]" />
            <div>
              <p className="text-sm font-medium text-gray-900">Total Income</p>
              <p className="text-xs text-gray-500">{fmtCurrency(totals.income)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#80CAEE]" />
            <div>
              <p className="text-sm font-medium text-gray-900">Total Expenses</p>
              <p className="text-xs text-gray-500">{fmtCurrency(totals.expenses)}</p>
            </div>
          </div>
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

        {/* Right: Controls */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Milestones toggle */}
          {milestones.length > 0 && (
            <button
              onClick={() => setShowMilestones(!showMilestones)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                showMilestones
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              title={showMilestones ? 'Hide milestones' : 'Show go-live date and resident move-in dates on chart'}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
              Milestones
            </button>
          )}

          {/* Detailed mode toggle */}
          <button
            onClick={() => setDetailedMode(!detailedMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              detailedMode
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            title={detailedMode ? 'Switch to simple tooltips' : 'Enable detailed tooltips with resident & expense breakdowns'}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            {detailedMode ? 'Insights On' : 'Insights'}
          </button>

          {/* Period toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-0.5">
            {(['all', '12m', '6m', '3m'] as TimePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === p
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed mode hint */}
      {detailedMode && (
        <div className="mx-6 mb-3 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg">
          <p className="text-xs text-indigo-700">
            <strong>Insights mode:</strong> Hover over any month to see per-resident income breakdown and per-category expense details.
          </p>
        </div>
      )}

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
                interval={chartData.length > 12 ? Math.floor(chartData.length / 12) : 0}
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
                content={
                  detailedMode
                    ? <DetailedTooltip chartData={chartData} />
                    : <SimpleTooltip />
                }
                cursor={{ stroke: '#d1d5db', strokeWidth: 1 }}
              />

              <Area
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="#3C50E0"
                strokeWidth={2}
                fill="url(#incomeGrad)"
                dot={chartData.length <= 12 ? { r: 3, fill: '#3C50E0', stroke: '#fff', strokeWidth: 2 } : false}
                activeDot={{ r: 5, fill: '#3C50E0', stroke: '#fff', strokeWidth: 2 }}
              />

              <Area
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#80CAEE"
                strokeWidth={2}
                fill="url(#expenseGrad)"
                dot={chartData.length <= 12 ? { r: 3, fill: '#80CAEE', stroke: '#fff', strokeWidth: 2 } : false}
                activeDot={{ r: 5, fill: '#80CAEE', stroke: '#fff', strokeWidth: 2 }}
              />

              {/* Milestone reference lines */}
              {showMilestones && milestoneMarkers.map((m, idx) => (
                <ReferenceLine
                  key={`milestone-${idx}`}
                  x={m.shortLabel}
                  stroke={m.type === 'go-live' ? '#f59e0b' : '#8b5cf6'}
                  strokeDasharray="4 3"
                  strokeWidth={2}
                  label={{
                    value: m.type === 'go-live' ? '🏠 Go-Live' : `👤 ${m.label}`,
                    position: 'top',
                    fill: m.type === 'go-live' ? '#b45309' : '#6d28d9',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
              ))}
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

      {/* ── Milestones legend ── */}
      {showMilestones && milestoneMarkers.length > 0 && (
        <div className="px-6 pb-4 border-t border-gray-100">
          <div className="pt-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {milestoneMarkers.map((m, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs">
                <span
                  className={`w-3 h-0.5 rounded ${m.type === 'go-live' ? 'bg-amber-500' : 'bg-violet-500'}`}
                  style={{ borderTop: '2px dashed' }}
                />
                <span className={`font-medium ${m.type === 'go-live' ? 'text-amber-700' : 'text-violet-700'}`}>
                  {m.type === 'go-live' ? '🏠 Go-Live' : `👤 ${m.label}`}
                </span>
                <span className="text-gray-400">
                  {new Date(m.date).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
