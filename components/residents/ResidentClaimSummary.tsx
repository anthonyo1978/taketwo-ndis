"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

/* ───── Types ───── */
interface MonthData {
  month: string
  label: string
  shortLabel: string
  amount: number
  count: number
}

interface ClaimSummaryData {
  months: MonthData[]
  totals: { totalAmount: number; totalClaims: number }
}

interface ResidentClaimSummaryProps {
  residentId: string
}

type TimePeriod = 'all' | '6m' | '3m'

const PERIOD_LABELS: Record<TimePeriod, string> = {
  all: 'All Time',
  '6m': '6 Months',
  '3m': '3 Months',
}

const PERIOD_MONTHS: Record<TimePeriod, number> = {
  all: 0,
  '6m': 6,
  '3m': 3,
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

  const amount = payload.find((p: any) => p.dataKey === 'amount')?.value ?? 0
  const count = payload.find((p: any) => p.dataKey === 'count')?.value ?? 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 min-w-[200px]">
      <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Total Claimed
          </span>
          <span className="text-sm font-medium text-gray-900">{fmtCurrencyFull(amount)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
            Claims
          </span>
          <span className="text-sm font-medium text-gray-900">{count}</span>
        </div>
        {count > 0 && (
          <div className="border-t border-gray-100 pt-1.5 flex items-center justify-between gap-4">
            <span className="text-sm text-gray-500">Avg per claim</span>
            <span className="text-sm font-medium text-gray-700">
              {fmtCurrencyFull(amount / count)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ───── Component ───── */
export function ResidentClaimSummary({ residentId }: ResidentClaimSummaryProps) {
  const [data, setData] = useState<ClaimSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<TimePeriod>('all')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const months = PERIOD_MONTHS[period]
      const res = await fetch(`/api/residents/${residentId}/claim-summary?months=${months}`)
      const json = await res.json() as { success: boolean; data?: ClaimSummaryData; error?: string }
      if (json.success && json.data) {
        setData(json.data)
      } else {
        setError(json.error || 'Failed to load claim summary')
      }
    } catch (err) {
      console.error('Error fetching claim summary:', err)
      setError('Failed to load claim summary')
    } finally {
      setLoading(false)
    }
  }, [residentId, period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ── Loading ── */
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
            </div>
          </div>
          <div className="h-[320px] bg-gray-50 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <p className="text-sm text-red-500">{error}</p>
        <button onClick={fetchData} className="mt-2 text-sm text-blue-600 hover:underline">
          Retry
        </button>
      </div>
    )
  }

  const chartData = data?.months || []
  const totals = data?.totals || { totalAmount: 0, totalClaims: 0 }
  const hasData = chartData.some(d => d.amount > 0)

  // Calculate monthly average
  const monthsWithData = chartData.filter(d => d.amount > 0).length
  const avgMonthly = monthsWithData > 0 ? totals.totalAmount / monthsWithData : 0

  // X-axis props
  const xAxisProps = {
    dataKey: 'shortLabel' as const,
    tick: { fill: '#6b7280', fontSize: 12 },
    tickLine: false,
    axisLine: { stroke: '#e5e7eb' },
    dy: 8,
    interval: chartData.length > 12 ? Math.floor(chartData.length / 12) : 0,
  }

  return (
    <div className="space-y-6">
      {/* ── Chart Card ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Left: Summary stats */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Claim Summary</h3>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-600">Total Claimed</span>
                <span className="text-sm font-semibold text-gray-900 ml-1">
                  {fmtCurrency(totals.totalAmount)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                <span className="text-sm text-gray-600">Total Claims</span>
                <span className="text-sm font-semibold text-gray-900 ml-1">
                  {totals.totalClaims.toLocaleString()}
                </span>
              </div>
              {avgMonthly > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                  <span className="text-sm text-gray-600">Avg / Month</span>
                  <span className="text-sm font-semibold text-gray-900 ml-1">
                    {fmtCurrency(avgMonthly)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Period toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-0.5 self-start sm:self-auto">
            {(['all', '6m', '3m'] as TimePeriod[]).map((p) => (
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

        {/* Chart */}
        <div className="px-2 pb-4">
          {hasData ? (
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
                barCategoryGap="20%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  vertical={false}
                />
                <XAxis {...xAxisProps} />
                <YAxis
                  yAxisId="amount"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                  }
                  width={55}
                  domain={[0, 'auto']}
                />
                <YAxis
                  yAxisId="count"
                  orientation="right"
                  tick={{ fill: '#8b5cf6', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${v}`}
                  width={35}
                  allowDecimals={false}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                />

                {/* Amount bars */}
                <Bar
                  yAxisId="amount"
                  dataKey="amount"
                  name="Amount"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill="#3b82f6" />
                  ))}
                </Bar>

                {/* Claim count line */}
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="count"
                  name="Claims"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={chartData.length <= 12 ? { r: 3, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 } : false}
                  activeDot={{ r: 5, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[340px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-300 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                  />
                </svg>
                <p className="text-sm font-medium">No claim data yet</p>
                <p className="text-xs mt-1">
                  Transaction history will appear here once drawdowns are recorded
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Monthly Breakdown Table ── */}
      {hasData && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900">Monthly Breakdown</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Claims
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg / Claim
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[...chartData].reverse().map((m) => (
                  <tr key={m.month} className={m.amount === 0 ? 'opacity-40' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {m.label}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                      {m.count}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                      {fmtCurrencyFull(m.amount)}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                      {m.count > 0 ? fmtCurrencyFull(m.amount / m.count) : '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr className="font-semibold">
                  <td className="px-6 py-3 text-sm text-gray-900">Total</td>
                  <td className="px-6 py-3 text-sm text-gray-900 text-right">
                    {totals.totalClaims}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-900 text-right">
                    {fmtCurrencyFull(totals.totalAmount)}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500 text-right">
                    {totals.totalClaims > 0
                      ? fmtCurrencyFull(totals.totalAmount / totals.totalClaims)
                      : '–'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

