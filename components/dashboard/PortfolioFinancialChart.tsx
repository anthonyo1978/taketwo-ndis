"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'

/* ───── Types ───── */
interface MonthData {
  month: string
  label: string
  shortLabel: string
  income: number
  expenses: number
  net?: number
}

interface HouseBreakdown {
  houseId: string
  houseName: string
  income: number
  expenses: number
  net: number
}

interface Notable {
  month: string
  type: 'income' | 'expense'
  amount: number
  description?: string
  category?: string
}

interface FinancialData {
  months: MonthData[]
  totals: { income: number; expenses: number; net: number }
  byHouse: HouseBreakdown[]
  notables?: Notable[]
}

type TimePeriod = 'all' | '12m' | '6m'
type ChartMode = 'bars' | 'lines'

const PERIOD_LABELS: Record<TimePeriod, string> = {
  all: 'All Time',
  '12m': '12M',
  '6m': '6M',
}

const PERIOD_MONTHS: Record<TimePeriod, number> = {
  all: 0,
  '12m': 12,
  '6m': 6,
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

/* ───── Custom Tooltip ───── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  const income = payload.find((p: any) => p.dataKey === 'income')?.value ?? 0
  const expenses = payload.find((p: any) => p.dataKey === 'expenses')?.value ?? 0
  const net = income - expenses

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 min-w-[200px]">
      <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Income
          </span>
          <span className="text-sm font-medium text-gray-900">{fmtCurrencyFull(income)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            Expenses
          </span>
          <span className="text-sm font-medium text-gray-900">{fmtCurrencyFull(expenses)}</span>
        </div>
        <div className="border-t border-gray-100 pt-1.5 flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-gray-600">Net</span>
          <span className={`text-sm font-semibold ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {net >= 0 ? '+' : ''}{fmtCurrencyFull(net)}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ───── Component ───── */
export function PortfolioFinancialChart() {
  const [data, setData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<TimePeriod>('all')
  const [selectedHouseId, setSelectedHouseId] = useState<string | ''>('')
  const [chartMode, setChartMode] = useState<ChartMode>('bars')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const months = PERIOD_MONTHS[period]
      const houseParam = selectedHouseId ? `&houseId=${selectedHouseId}` : ''
      const res = await fetch(`/api/dashboard/financials?months=${months}${houseParam}`)
      const json = await res.json() as { success: boolean; data?: FinancialData; error?: string }
      if (json.success && json.data) {
        setData(json.data)
      } else {
        setError(json.error || 'Failed to load financial data')
      }
    } catch (err) {
      console.error('Error fetching dashboard financials:', err)
      setError('Failed to load financial data')
    } finally {
      setLoading(false)
    }
  }, [period, selectedHouseId])

  // Fetch house list for the dropdown (always portfolio-level)
  const [houses, setHouses] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    fetch('/api/dashboard/financials?months=1')
      .then(r => r.json() as Promise<{ success: boolean; data?: FinancialData }>)
      .then(json => {
        if (json.success && json.data?.byHouse) {
          setHouses(json.data.byHouse.map(h => ({ id: h.houseId, name: h.houseName })))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const chartData: MonthData[] = (data?.months || []).map(m => ({
    ...m,
    net: m.income - m.expenses,
  }))
  const totals = data?.totals || { income: 0, expenses: 0, net: 0 }
  const notables = data?.notables || []
  const hasData = chartData.some(d => d.income > 0 || d.expenses > 0)

  // Calculate averages for reference lines
  const avgIncome = chartData.length > 0
    ? chartData.reduce((s, m) => s + m.income, 0) / chartData.length
    : 0
  const avgExpenses = chartData.length > 0
    ? chartData.reduce((s, m) => s + m.expenses, 0) / chartData.length
    : 0

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="h-5 bg-gray-200 rounded w-48" />
            <div className="flex gap-2">
              <div className="h-8 w-24 bg-gray-200 rounded-lg" />
              <div className="h-8 w-16 bg-gray-200 rounded-lg" />
              <div className="h-8 w-12 bg-gray-200 rounded-lg" />
              <div className="h-8 w-12 bg-gray-200 rounded-lg" />
            </div>
          </div>
          <div className="h-[360px] bg-gray-50 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <p className="text-sm text-red-500">{error}</p>
        <button onClick={fetchData} className="mt-2 text-sm text-blue-600 hover:underline">Retry</button>
      </div>
    )
  }

  // Shared chart props
  const xAxisProps = {
    dataKey: 'shortLabel' as const,
    tick: { fill: '#6b7280', fontSize: 12 },
    tickLine: false,
    axisLine: { stroke: '#e5e7eb' },
    dy: 8,
    interval: chartData.length > 12 ? Math.floor(chartData.length / 12) : 0,
  }

  const yAxisProps = {
    tick: { fill: '#6b7280', fontSize: 12 },
    tickLine: false,
    axisLine: false,
    tickFormatter: (v: number) =>
      v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`,
    width: 55,
  }

  const gridProps = {
    strokeDasharray: '3 3',
    stroke: '#e5e7eb',
    vertical: false,
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Left: Title + summary */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedHouseId ? houses.find(h => h.id === selectedHouseId)?.name || 'House' : 'Portfolio'} — Income vs Expenses
          </h3>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-sm text-gray-600">Income</span>
              <span className="text-sm font-semibold text-gray-900 ml-1">{fmtCurrency(totals.income)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span className="text-sm text-gray-600">Expenses</span>
              <span className="text-sm font-semibold text-gray-900 ml-1">{fmtCurrency(totals.expenses)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${totals.net >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-sm text-gray-600">Net</span>
              <span className={`text-sm font-bold ml-1 ${totals.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {totals.net >= 0 ? '+' : ''}{fmtCurrency(totals.net)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0 flex-wrap">
          {/* House filter */}
          <select
            value={selectedHouseId}
            onChange={(e) => setSelectedHouseId(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Houses</option>
            {houses.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>

          {/* Chart mode toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setChartMode('bars')}
              className={`p-1.5 rounded-md transition-colors ${
                chartMode === 'bars'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Bar chart"
            >
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h2v8H3zM8 9h2v12H8zM13 5h2v16h-2zM18 1h2v20h-2z" />
              </svg>
            </button>
            <button
              onClick={() => setChartMode('lines')}
              className={`p-1.5 rounded-md transition-colors ${
                chartMode === 'lines'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Line chart"
            >
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
              </svg>
            </button>
          </div>

          {/* Period toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            {(['all', '12m', '6m'] as TimePeriod[]).map((p) => (
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

      {/* ── Chart ── */}
      <div className="px-2 pb-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height={360}>
            {chartMode === 'bars' ? (
              <ComposedChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
                barCategoryGap="20%"
              >
                <CartesianGrid {...gridProps} />
                <XAxis {...xAxisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                />

                {/* Average reference lines */}
                {avgIncome > 0 && (
                  <ReferenceLine
                    y={avgIncome}
                    stroke="#10b981"
                    strokeDasharray="6 4"
                    strokeOpacity={0.5}
                    label={{
                      value: `Avg income ${fmtCurrency(avgIncome)}`,
                      position: 'insideTopRight',
                      fill: '#10b981',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                )}
                {avgExpenses > 0 && (
                  <ReferenceLine
                    y={avgExpenses}
                    stroke="#fb7185"
                    strokeDasharray="6 4"
                    strokeOpacity={0.5}
                    label={{
                      value: `Avg expenses ${fmtCurrency(avgExpenses)}`,
                      position: 'insideBottomRight',
                      fill: '#fb7185',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                )}

                <Bar dataKey="income" name="Income" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill="#10b981" />
                  ))}
                </Bar>
                <Bar dataKey="expenses" name="Expenses" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill="#fb7185" />
                  ))}
                </Bar>

                {/* Net line overlaid on bars */}
                <Line
                  type="monotone"
                  dataKey="net"
                  name="Net"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={chartData.length <= 12 ? { r: 3, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 } : false}
                  activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                />
              </ComposedChart>
            ) : (
              <AreaChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="portfolioIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="portfolioExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid {...gridProps} />
                <XAxis {...xAxisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: '#d1d5db', strokeWidth: 1 }}
                />

                {/* Average reference lines */}
                {avgIncome > 0 && (
                  <ReferenceLine
                    y={avgIncome}
                    stroke="#10b981"
                    strokeDasharray="6 4"
                    strokeOpacity={0.5}
                    label={{
                      value: `Avg ${fmtCurrency(avgIncome)}`,
                      position: 'insideTopRight',
                      fill: '#10b981',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                )}
                {avgExpenses > 0 && (
                  <ReferenceLine
                    y={avgExpenses}
                    stroke="#fb7185"
                    strokeDasharray="6 4"
                    strokeOpacity={0.5}
                    label={{
                      value: `Avg ${fmtCurrency(avgExpenses)}`,
                      position: 'insideBottomRight',
                      fill: '#fb7185',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                )}

                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#portfolioIncomeGrad)"
                  dot={chartData.length <= 12 ? { r: 3, fill: '#10b981', stroke: '#fff', strokeWidth: 2 } : false}
                  activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                />

                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke="#fb7185"
                  strokeWidth={2}
                  fill="url(#portfolioExpenseGrad)"
                  dot={chartData.length <= 12 ? { r: 3, fill: '#fb7185', stroke: '#fff', strokeWidth: 2 } : false}
                  activeDot={{ r: 5, fill: '#fb7185', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="h-[360px] flex items-center justify-center text-gray-400">
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

      {/* ── Notable items footnotes ── */}
      {notables.length > 0 && (
        <div className="px-6 pb-5 border-t border-gray-100">
          <div className="pt-3 space-y-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Notable Months
            </p>
            {notables.map((n, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                  n.type === 'expense' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {n.type === 'expense' ? (
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M12 3l9.66 16.5H2.34L12 3z" />
                    </svg>
                  ) : (
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  )}
                </span>
                <div className="min-w-0">
                  <span className="font-medium text-gray-700">{n.month}</span>
                  <span className="text-gray-400 mx-1">·</span>
                  <span className={`font-semibold ${n.type === 'expense' ? 'text-amber-700' : 'text-blue-700'}`}>
                    {fmtCurrency(n.amount)} {n.type === 'expense' ? 'in expenses' : 'income'}
                  </span>
                  {n.description && (
                    <>
                      <span className="text-gray-400 mx-1">—</span>
                      <span className="text-gray-500">
                        {n.description}
                        {n.category && n.category !== 'other' && (
                          <span className="ml-1 text-gray-400">({CATEGORY_LABELS[n.category] || n.category})</span>
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
