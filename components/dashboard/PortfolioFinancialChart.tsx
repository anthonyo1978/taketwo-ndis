"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
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
  Cell,
} from 'recharts'

/* ───── Types ───── */
interface IncomeBreakdown {
  name: string
  amount: number
}

interface ExpenseBreakdown {
  category: string
  amount: number
  topItem?: string
  scope?: 'property' | 'organisation'
}

interface MonthData {
  month: string
  label: string
  shortLabel: string
  income: number
  expenses: number
  propertyExpenses?: number
  orgExpenses?: number
  net?: number
  incomeBreakdown?: IncomeBreakdown[]
  expenseBreakdown?: ExpenseBreakdown[]
}

interface HouseBreakdown {
  houseId: string
  houseName: string
  income: number
  expenses: number
  net: number
  grossProfit?: number
}

interface FinancialTotals {
  income: number
  expenses: number
  propertyExpenses: number
  orgExpenses: number
  net: number
  portfolioGrossProfit: number
  netOperatingProfit: number
}

interface FinancialData {
  months: MonthData[]
  totals: FinancialTotals
  byHouse: HouseBreakdown[]
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
  // Property categories
  head_lease: 'Head Lease',
  utilities: 'Utilities',
  maintenance: 'Maintenance',
  cleaning: 'Cleaning',
  insurance: 'Insurance',
  compliance: 'Compliance',
  repairs: 'Repairs',
  // Organisation categories
  salaries: 'Salaries',
  software: 'Software',
  office_rent: 'Office Rent',
  marketing: 'Marketing',
  accounting: 'Accounting',
  corporate_insurance: 'Corporate Insurance',
  vehicles: 'Vehicles',
  // Legacy / shared
  rent: 'Rent',
  rates: 'Rates',
  management_fee: 'Management Fee',
  other: 'Other',
}

/* How many breakdown items to show in the hover tooltip before truncating */
const TOOLTIP_MAX_ITEMS = 3

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
function SimpleTooltip({ active, payload, label, splitExpenses }: any) {
  if (!active || !payload?.length) return null

  const income = payload.find((p: any) => p.dataKey === 'income')?.value ?? 0
  // When split, sum the two stacked values; otherwise take the single expenses value
  const propExp = payload.find((p: any) => p.dataKey === 'propertyExpenses')?.value ?? 0
  const orgExp = payload.find((p: any) => p.dataKey === 'orgExpenses')?.value ?? 0
  const combinedExp = payload.find((p: any) => p.dataKey === 'expenses')?.value
  const expenses = splitExpenses ? (propExp + orgExp) : (combinedExp ?? propExp + orgExp)
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

        {splitExpenses ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-sm text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                Property
              </span>
              <span className="text-sm font-medium text-gray-900">{fmtCurrencyFull(propExp)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-sm text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                Organisation
              </span>
              <span className="text-sm font-medium text-gray-900">{fmtCurrencyFull(orgExp)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-xs text-gray-400 pt-0.5">
              <span>Total Expenses</span>
              <span>{fmtCurrencyFull(expenses)}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              Expenses
            </span>
            <span className="text-sm font-medium text-gray-900">{fmtCurrencyFull(expenses)}</span>
          </div>
        )}

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

/* ───── Compact Detailed Tooltip (hover — top N items + "click for more") ───── */
function DetailedTooltip({ active, payload, label, chartData, isHouseFiltered, splitExpenses }: any) {
  if (!active || !payload?.length) return null

  const income = payload.find((p: any) => p.dataKey === 'income')?.value ?? 0
  const propExp = payload.find((p: any) => p.dataKey === 'propertyExpenses')?.value ?? 0
  const orgExp = payload.find((p: any) => p.dataKey === 'orgExpenses')?.value ?? 0
  const combinedExp = payload.find((p: any) => p.dataKey === 'expenses')?.value
  const expenses = splitExpenses ? (propExp + orgExp) : (combinedExp ?? propExp + orgExp)
  const net = income - expenses

  const payloadMonth = payload[0]?.payload?.month
  const monthData: MonthData | undefined = (chartData || []).find(
    (d: MonthData) => d.month === payloadMonth || d.label === label || d.shortLabel === label
  )

  const incomeBreakdown = monthData?.incomeBreakdown || []
  const expenseBreakdown = monthData?.expenseBreakdown || []
  const sourceLabel = isHouseFiltered ? 'Resident' : 'House'

  const visibleIncome = incomeBreakdown.slice(0, TOOLTIP_MAX_ITEMS)
  const hiddenIncomeCount = incomeBreakdown.length - visibleIncome.length
  const visibleExpense = expenseBreakdown.slice(0, TOOLTIP_MAX_ITEMS)
  const hiddenExpenseCount = expenseBreakdown.length - visibleExpense.length

  const hasHiddenItems = hiddenIncomeCount > 0 || hiddenExpenseCount > 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-4 min-w-[280px] max-w-[380px]">
      <p className="text-sm font-bold text-gray-900 mb-3">{monthData?.label || label}</p>

      {/* ── Income section ── */}
      <div className="mb-3">
        <div className="flex items-center justify-between gap-4 mb-1">
          <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Income
          </span>
          <span className="text-sm font-semibold text-gray-900">{fmtCurrencyFull(income)}</span>
        </div>

        {visibleIncome.length > 0 && (
          <div className="ml-4 mt-1 space-y-0.5">
            {visibleIncome.map((entry: IncomeBreakdown, i: number) => {
              const pct = income > 0 ? Math.round((entry.amount / income) * 100) : 0
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${
                    isHouseFiltered
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {entry.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <span className="text-gray-600 truncate flex-1">{entry.name}</span>
                  <span className="text-gray-900 font-medium tabular-nums">{fmtCurrencyFull(entry.amount)}</span>
                  <span className="text-gray-400 text-[10px] w-8 text-right">{pct}%</span>
                </div>
              )
            })}
            {hiddenIncomeCount > 0 && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                +{hiddenIncomeCount} more {sourceLabel.toLowerCase()}{hiddenIncomeCount > 1 ? 's' : ''}
              </p>
            )}
            {hiddenIncomeCount === 0 && incomeBreakdown.length > 0 && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                {incomeBreakdown.length} {sourceLabel.toLowerCase()}{incomeBreakdown.length > 1 ? 's' : ''} contributing
              </p>
            )}
          </div>
        )}
        {incomeBreakdown.length === 0 && income > 0 && (
          <p className="ml-4 text-xs text-gray-400 italic">No breakdown available</p>
        )}
      </div>

      {/* ── Expenses section ── */}
      {splitExpenses ? (
        <>
          {/* Property expenses */}
          {propExp > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between gap-4 mb-1">
                <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  Property
                </span>
                <span className="text-sm font-semibold text-gray-900">{fmtCurrencyFull(propExp)}</span>
              </div>
              {(() => {
                const propItems = expenseBreakdown.filter((c: ExpenseBreakdown) => c.scope !== 'organisation').slice(0, TOOLTIP_MAX_ITEMS)
                const propTotal = expenseBreakdown.filter((c: ExpenseBreakdown) => c.scope !== 'organisation').length
                const propHidden = propTotal - propItems.length
                return propItems.length > 0 ? (
                  <div className="ml-4 space-y-0.5">
                    {propItems.map((c: ExpenseBreakdown, i: number) => {
                      const pct = propExp > 0 ? Math.round((c.amount / propExp) * 100) : 0
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-300 flex-shrink-0" />
                          <span className="text-gray-600 truncate flex-1">
                            {CATEGORY_LABELS[c.category] || c.category}
                          </span>
                          <span className="text-gray-900 font-medium tabular-nums">{fmtCurrencyFull(c.amount)}</span>
                          <span className="text-gray-400 text-[10px] w-8 text-right">{pct}%</span>
                        </div>
                      )
                    })}
                    {propHidden > 0 && (
                      <p className="text-[10px] text-gray-400">+{propHidden} more</p>
                    )}
                  </div>
                ) : null
              })()}
            </div>
          )}
          {/* Org expenses */}
          {orgExp > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between gap-4 mb-1">
                <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  Organisation
                </span>
                <span className="text-sm font-semibold text-gray-900">{fmtCurrencyFull(orgExp)}</span>
              </div>
              {(() => {
                const orgItems = expenseBreakdown.filter((c: ExpenseBreakdown) => c.scope === 'organisation').slice(0, TOOLTIP_MAX_ITEMS)
                const orgTotal = expenseBreakdown.filter((c: ExpenseBreakdown) => c.scope === 'organisation').length
                const orgHidden = orgTotal - orgItems.length
                return orgItems.length > 0 ? (
                  <div className="ml-4 space-y-0.5">
                    {orgItems.map((c: ExpenseBreakdown, i: number) => {
                      const pct = orgExp > 0 ? Math.round((c.amount / orgExp) * 100) : 0
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-300 flex-shrink-0" />
                          <span className="text-gray-600 truncate flex-1">
                            {CATEGORY_LABELS[c.category] || c.category}
                          </span>
                          <span className="text-gray-900 font-medium tabular-nums">{fmtCurrencyFull(c.amount)}</span>
                          <span className="text-gray-400 text-[10px] w-8 text-right">{pct}%</span>
                        </div>
                      )
                    })}
                    {orgHidden > 0 && (
                      <p className="text-[10px] text-gray-400">+{orgHidden} more</p>
                    )}
                  </div>
                ) : null
              })()}
            </div>
          )}
        </>
      ) : (
        <div className="mb-3">
          <div className="flex items-center justify-between gap-4 mb-1">
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              Expenses
            </span>
            <span className="text-sm font-semibold text-gray-900">{fmtCurrencyFull(expenses)}</span>
          </div>

          {visibleExpense.length > 0 && (
            <div className="ml-4 mt-1 space-y-0.5">
              {visibleExpense.map((c: ExpenseBreakdown, i: number) => {
                const pct = expenses > 0 ? Math.round((c.amount / expenses) * 100) : 0
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.scope === 'organisation' ? 'bg-amber-300' : 'bg-rose-300'}`} />
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
              {hiddenExpenseCount > 0 && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  +{hiddenExpenseCount} more categor{hiddenExpenseCount > 1 ? 'ies' : 'y'}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Net ── */}
      <div className="border-t border-gray-100 pt-2 flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-gray-600">Net</span>
        <span className={`text-sm font-bold ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {net >= 0 ? '+' : ''}{fmtCurrencyFull(net)}
        </span>
      </div>

      {/* ── Click hint ── */}
      {hasHiddenItems && (
        <p className="text-[10px] text-indigo-500 text-center mt-2 font-medium">
          Click month for full breakdown
        </p>
      )}
    </div>
  )
}

/* ───── Pinned Detail Panel (click — shows everything, scrollable) ───── */
function MonthDetailPanel({
  monthData,
  isHouseFiltered,
  onClose,
}: {
  monthData: MonthData
  isHouseFiltered: boolean
  onClose: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const income = monthData.income
  const expenses = monthData.expenses
  const propExp = monthData.propertyExpenses ?? 0
  const orgExp = monthData.orgExpenses ?? 0
  const net = income - expenses
  const incomeBreakdown = monthData.incomeBreakdown || []
  const expenseBreakdown = monthData.expenseBreakdown || []
  const sourceLabel = isHouseFiltered ? 'Resident' : 'House'

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={panelRef}
      className="mx-6 mb-4 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
    >
      {/* Header */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h4 className="text-sm font-bold text-gray-900">{monthData.label}</h4>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-gray-900">{fmtCurrencyFull(income)}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="font-semibold text-gray-900">{fmtCurrencyFull(propExp)}</span>
              <span className="text-gray-400">prop</span>
            </span>
            {orgExp > 0 && (
              <span className="inline-flex items-center gap-1 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-semibold text-gray-900">{fmtCurrencyFull(orgExp)}</span>
                <span className="text-gray-400">org</span>
              </span>
            )}
            <span className={`text-xs font-bold ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              Net {net >= 0 ? '+' : ''}{fmtCurrencyFull(net)}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
          title="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body — two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
        {/* Income column */}
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold text-gray-700">Income</span>
            <span className="text-xs text-gray-400 ml-auto">{incomeBreakdown.length} {sourceLabel.toLowerCase()}{incomeBreakdown.length !== 1 ? 's' : ''}</span>
          </div>
          {incomeBreakdown.length > 0 ? (
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}>
              {incomeBreakdown.map((entry: IncomeBreakdown, i: number) => {
                const pct = income > 0 ? Math.round((entry.amount / income) * 100) : 0
                const barWidth = income > 0 ? Math.max((entry.amount / income) * 100, 2) : 0
                return (
                  <div key={i}>
                    <div className="flex items-center gap-2 text-xs">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${
                        isHouseFiltered ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {entry.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="text-gray-700 truncate flex-1 font-medium">{entry.name}</span>
                      <span className="text-gray-900 font-semibold tabular-nums">{fmtCurrencyFull(entry.amount)}</span>
                      <span className="text-gray-400 text-[10px] w-8 text-right">{pct}%</span>
                    </div>
                    <div className="ml-7 mt-0.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No breakdown available</p>
          )}
        </div>

        {/* Expenses column */}
        <div className="p-4">
          {(() => {
            const propBreakdown = expenseBreakdown.filter((c: ExpenseBreakdown) => c.scope !== 'organisation')
            const orgBreakdown = expenseBreakdown.filter((c: ExpenseBreakdown) => c.scope === 'organisation')
            const hasBothScopes = propBreakdown.length > 0 && orgBreakdown.length > 0

            return (
              <>
                {/* Property expenses */}
                {propBreakdown.length > 0 && (
                  <>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <span className="text-sm font-semibold text-gray-700">
                        {hasBothScopes ? 'Property Expenses' : 'Expenses'}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {hasBothScopes ? fmtCurrencyFull(propExp) : `${propBreakdown.length} categor${propBreakdown.length !== 1 ? 'ies' : 'y'}`}
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}>
                      {propBreakdown.map((c: ExpenseBreakdown, i: number) => {
                        const base = propExp > 0 ? propExp : expenses
                        const pct = base > 0 ? Math.round((c.amount / base) * 100) : 0
                        const barWidth = base > 0 ? Math.max((c.amount / base) * 100, 2) : 0
                        return (
                          <div key={i}>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="w-2 h-2 rounded-full bg-rose-300 flex-shrink-0" />
                              <span className="text-gray-700 truncate flex-1 font-medium">
                                {CATEGORY_LABELS[c.category] || c.category}
                                {c.topItem && c.topItem !== c.category && (
                                  <span className="text-gray-400 font-normal ml-1">({c.topItem})</span>
                                )}
                              </span>
                              <span className="text-gray-900 font-semibold tabular-nums">{fmtCurrencyFull(c.amount)}</span>
                              <span className="text-gray-400 text-[10px] w-8 text-right">{pct}%</span>
                            </div>
                            <div className="ml-4 mt-0.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-300 rounded-full" style={{ width: `${barWidth}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}

                {/* Org expenses */}
                {orgBreakdown.length > 0 && (
                  <>
                    <div className={`flex items-center gap-1.5 mb-2 ${propBreakdown.length > 0 ? 'mt-4 pt-3 border-t border-gray-100' : ''}`}>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="text-sm font-semibold text-gray-700">Organisation Expenses</span>
                      <span className="text-xs text-gray-400 ml-auto">{fmtCurrencyFull(orgExp)}</span>
                    </div>
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}>
                      {orgBreakdown.map((c: ExpenseBreakdown, i: number) => {
                        const pct = orgExp > 0 ? Math.round((c.amount / orgExp) * 100) : 0
                        const barWidth = orgExp > 0 ? Math.max((c.amount / orgExp) * 100, 2) : 0
                        return (
                          <div key={i}>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="w-2 h-2 rounded-full bg-amber-300 flex-shrink-0" />
                              <span className="text-gray-700 truncate flex-1 font-medium">
                                {CATEGORY_LABELS[c.category] || c.category}
                                {c.topItem && c.topItem !== c.category && (
                                  <span className="text-gray-400 font-normal ml-1">({c.topItem})</span>
                                )}
                              </span>
                              <span className="text-gray-900 font-semibold tabular-nums">{fmtCurrencyFull(c.amount)}</span>
                              <span className="text-gray-400 text-[10px] w-8 text-right">{pct}%</span>
                            </div>
                            <div className="ml-4 mt-0.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-300 rounded-full" style={{ width: `${barWidth}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}

                {expenseBreakdown.length === 0 && (
                  <p className="text-xs text-gray-400 italic">No expenses recorded</p>
                )}
              </>
            )
          })()}
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
  const [chartMode, setChartMode] = useState<ChartMode>('lines')
  const [detailedMode, setDetailedMode] = useState(true)
  const [splitExpenses, setSplitExpenses] = useState(false)
  // Pinned month detail panel (click-to-expand)
  const [pinnedMonth, setPinnedMonth] = useState<MonthData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const months = PERIOD_MONTHS[period]
      const houseParam = selectedHouseId ? `&houseId=${selectedHouseId}` : ''
      const detailParam = detailedMode ? '&detailed=1' : ''
      const res = await fetch(`/api/dashboard/financials?months=${months}${houseParam}${detailParam}`)
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
  }, [period, selectedHouseId, detailedMode])

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

  // Close pinned panel when data changes
  useEffect(() => {
    setPinnedMonth(null)
  }, [period, selectedHouseId, detailedMode])

  // When filtering to a single house, disable split (all expenses are property-scoped)
  useEffect(() => {
    if (selectedHouseId) setSplitExpenses(false)
  }, [selectedHouseId])

  const chartData: MonthData[] = (data?.months || []).map(m => ({
    ...m,
    propertyExpenses: m.propertyExpenses ?? m.expenses,
    orgExpenses: m.orgExpenses ?? 0,
    net: Math.max(0, m.income - m.expenses),
  }))
  const totals = data?.totals || { income: 0, expenses: 0, propertyExpenses: 0, orgExpenses: 0, net: 0, portfolioGrossProfit: 0, netOperatingProfit: 0 }
  const hasData = chartData.some(d => d.income > 0 || d.expenses > 0)
  const hasOrgExpenses = chartData.some(d => (d.orgExpenses ?? 0) > 0)
  const useFullLabel = chartData.length > 12
  const xDataKey = useFullLabel ? 'label' : 'shortLabel'

  // Handle chart click → pin a month detail panel
  const handleChartClick = useCallback((state: any) => {
    if (!detailedMode || !state?.activePayload?.length) return
    const clickedMonth = state.activePayload[0]?.payload?.month
    if (!clickedMonth) return
    const found = chartData.find(d => d.month === clickedMonth)
    if (found) {
      // Toggle: click same month again to close
      setPinnedMonth(prev => prev?.month === found.month ? null : found)
    }
  }, [detailedMode, chartData])

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
    dataKey: xDataKey,
    tick: { fill: '#6b7280', fontSize: useFullLabel ? 10 : 12 },
    tickLine: false as const,
    axisLine: { stroke: '#e5e7eb' },
    dy: 8,
    interval: chartData.length > 12 ? Math.floor(chartData.length / 12) : 0,
    angle: useFullLabel && chartData.length > 18 ? -35 : 0,
    textAnchor: (useFullLabel && chartData.length > 18 ? 'end' : 'middle') as 'end' | 'middle',
  }

  const yAxisProps = {
    tick: { fill: '#6b7280', fontSize: 12 },
    tickLine: false,
    axisLine: false,
    tickFormatter: (v: number) =>
      v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`,
    width: 55,
    domain: [0, 'auto'] as [number, string],
  }

  const gridProps = {
    strokeDasharray: '3 3',
    stroke: '#e5e7eb',
    vertical: false,
  }

  const tooltipContent = detailedMode
    ? <DetailedTooltip chartData={chartData} isHouseFiltered={!!selectedHouseId} splitExpenses={splitExpenses} />
    : <SimpleTooltip splitExpenses={splitExpenses} />

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        {/* Left: Title + inline summary */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="text-lg font-semibold text-gray-900 whitespace-nowrap">
              {selectedHouseId ? houses.find(h => h.id === selectedHouseId)?.name || 'House' : 'Portfolio'} — Income vs Expenses
            </h3>
            <div className="flex items-center gap-x-4 gap-y-1 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-gray-500">Income</span>
                <span className="font-semibold text-gray-900">{fmtCurrency(totals.income)}</span>
              </span>

              {splitExpenses ? (
                <>
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span className="text-gray-500">Property</span>
                    <span className="font-semibold text-gray-900">{fmtCurrency(totals.propertyExpenses)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-gray-500">Org</span>
                    <span className="font-semibold text-gray-900">{fmtCurrency(totals.orgExpenses)}</span>
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-gray-500">Expenses</span>
                  <span className="font-semibold text-gray-900">{fmtCurrency(totals.expenses)}</span>
                </span>
              )}

              <span className="inline-flex items-center gap-1.5 text-sm">
                <span className={`w-2 h-2 rounded-full ${totals.net >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className="text-gray-500">Net</span>
                <span className={`font-bold ${totals.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {totals.net >= 0 ? '+' : ''}{fmtCurrency(totals.net)}
                </span>
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

          {/* Expense split toggle — only show when viewing all houses and there are org expenses */}
          {!selectedHouseId && hasOrgExpenses && (
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setSplitExpenses(false)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  !splitExpenses
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Show combined expenses"
              >
                Combined
              </button>
              <button
                onClick={() => setSplitExpenses(true)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  splitExpenses
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Split expenses into Property vs Organisation"
              >
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Split
                </span>
              </button>
            </div>
          )}

          {/* Insights toggle */}
          <button
            onClick={() => setDetailedMode(!detailedMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              detailedMode
                ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            title={detailedMode
              ? 'Switch to simple tooltips'
              : selectedHouseId
                ? 'Enable detailed tooltips with per-resident income & expense category breakdowns'
                : 'Enable detailed tooltips with per-house income & expense category breakdowns'
            }
          >
            <svg className={`w-3.5 h-3.5 transition-colors ${detailedMode ? 'text-amber-500' : ''}`} fill={detailedMode ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            {detailedMode ? 'Insights On' : 'Insights'}
          </button>

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

      {/* Detailed mode hint */}
      {detailedMode && !pinnedMonth && (
        <div className="mx-6 mb-3 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg">
          <p className="text-xs text-indigo-700">
            <strong>Insights mode:</strong> Hover for a summary, <strong>click any month</strong> for the full breakdown.
          </p>
        </div>
      )}

      {/* ── Chart ── */}
      <div className="px-2 pb-4" style={{ cursor: detailedMode ? 'pointer' : undefined }}>
        {hasData ? (
          <ResponsiveContainer width="100%" height={360}>
            {chartMode === 'bars' ? (
              <ComposedChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
                barCategoryGap="20%"
                onClick={handleChartClick}
              >
                <CartesianGrid {...gridProps} />
                <XAxis {...xAxisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip
                  content={tooltipContent}
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                />

                <Bar dataKey="income" name="Income" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill="#10b981" />
                  ))}
                </Bar>

                {splitExpenses ? (
                  <>
                    {/* Stacked: property on bottom, org on top */}
                    <Bar dataKey="propertyExpenses" name="Property Expenses" stackId="expenses" maxBarSize={28}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill="#fb7185" />
                      ))}
                    </Bar>
                    <Bar dataKey="orgExpenses" name="Org Expenses" stackId="expenses" radius={[4, 4, 0, 0]} maxBarSize={28}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill="#fbbf24" />
                      ))}
                    </Bar>
                  </>
                ) : (
                  <Bar dataKey="expenses" name="Expenses" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill="#fb7185" />
                    ))}
                  </Bar>
                )}

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
                onClick={handleChartClick}
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
                  <linearGradient id="portfolioPropExpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="portfolioOrgExpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.05} />
                  </linearGradient>
                </defs>

                <CartesianGrid {...gridProps} />
                <XAxis {...xAxisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip
                  content={tooltipContent}
                  cursor={{ stroke: '#d1d5db', strokeWidth: 1 }}
                />

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

                {splitExpenses ? (
                  <>
                    {/* Stacked areas: property on bottom, org on top */}
                    <Area
                      type="monotone"
                      dataKey="propertyExpenses"
                      name="Property Expenses"
                      stackId="expenses"
                      stroke="#fb7185"
                      strokeWidth={2}
                      fill="url(#portfolioPropExpGrad)"
                      dot={chartData.length <= 12 ? { r: 3, fill: '#fb7185', stroke: '#fff', strokeWidth: 2 } : false}
                      activeDot={{ r: 5, fill: '#fb7185', stroke: '#fff', strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="orgExpenses"
                      name="Org Expenses"
                      stackId="expenses"
                      stroke="#fbbf24"
                      strokeWidth={2}
                      fill="url(#portfolioOrgExpGrad)"
                      dot={chartData.length <= 12 ? { r: 3, fill: '#fbbf24', stroke: '#fff', strokeWidth: 2 } : false}
                      activeDot={{ r: 5, fill: '#fbbf24', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </>
                ) : (
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
                )}
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

      {/* ── Pinned Month Detail Panel (below chart) ── */}
      {pinnedMonth && (
        <MonthDetailPanel
          monthData={pinnedMonth}
          isHouseFiltered={!!selectedHouseId}
          onClose={() => setPinnedMonth(null)}
        />
      )}
    </div>
  )
}
