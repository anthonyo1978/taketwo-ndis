'use client'

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Zap,
  Plus,
  Play,
  RefreshCw,
  Search,
  Loader2,
  ChevronRight,
  Power,
  AlertTriangle,
  CheckCircle2,
  Ban,
} from 'lucide-react'
import type { Automation, AutomationType, AutomationHealthStatus, AutomationCreateInput } from 'types/automation'
import {
  AUTOMATION_TYPE_LABELS,
  AUTOMATION_TYPE_DESCRIPTIONS,
  describeSchedule,
  getAutomationHealth,
  HEALTH_LABELS,
} from 'types/automation'
import { CreateAutomationModal } from 'components/automations/CreateAutomationModal'

/* ─── Health Status Badge ─── */
function HealthBadge({ health }: { health: AutomationHealthStatus }) {
  switch (health) {
    case 'active':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </span>
      )
    case 'broken':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
          <AlertTriangle className="w-3 h-3" />
          Broken
        </span>
      )
    case 'disabled':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-500 ring-1 ring-gray-200">
          <Ban className="w-3 h-3" />
          Disabled
        </span>
      )
  }
}

/* ─── Type Icon ─── */
function TypeIcon({ type }: { type: AutomationType }) {
  const isRecurring = type === 'recurring_transaction'
  return (
    <div
      className={`flex items-center justify-center w-10 h-10 rounded-xl ${
        isRecurring ? 'bg-indigo-100' : 'bg-amber-100'
      }`}
    >
      {isRecurring ? (
        <RefreshCw className="w-5 h-5 text-indigo-600" />
      ) : (
        <Zap className="w-5 h-5 text-amber-600" />
      )}
    </div>
  )
}

/* ─── Relative date helper ─── */
function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const absDiff = Math.abs(diff)

  if (absDiff < 60_000) return diff > 0 ? 'in < 1 min' : 'just now'
  if (absDiff < 3_600_000) {
    const mins = Math.round(absDiff / 60_000)
    return diff > 0 ? `in ${mins}m` : `${mins}m ago`
  }
  if (absDiff < 86_400_000) {
    const hrs = Math.round(absDiff / 3_600_000)
    return diff > 0 ? `in ${hrs}h` : `${hrs}h ago`
  }
  const days = Math.round(absDiff / 86_400_000)
  if (days < 7) return diff > 0 ? `in ${days}d` : `${days}d ago`
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

/* ─── Summary counts ─── */
function useSummaryCounts(automations: Automation[]) {
  let active = 0
  let broken = 0
  let disabled = 0
  for (const a of automations) {
    const h = getAutomationHealth(a)
    if (h === 'active') active++
    else if (h === 'broken') broken++
    else disabled++
  }
  return { active, broken, disabled, total: automations.length }
}

/* ═══════════════════════════════════════════════════════════
   Page (wrapped in Suspense for useSearchParams)
   ═══════════════════════════════════════════════════════════ */
export default function AutomationsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}>
      <AutomationsPageInner />
    </Suspense>
  )
}

function AutomationsPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<AutomationType | ''>('')
  const [filterHealth, setFilterHealth] = useState<AutomationHealthStatus | ''>('')
  const [runningId, setRunningId] = useState<string | null>(null)

  // Build prefill from query params (e.g. from house page "Set up recurring" links)
  const prefillFromParams = useMemo(() => {
    const isNew = searchParams.get('new') === 'true'
    if (!isNew) return null

    const scope = searchParams.get('scope') as 'property' | 'organisation' | null
    const houseId = searchParams.get('houseId')
    const houseName = searchParams.get('houseName')
    const category = searchParams.get('category')

    const prefill: Partial<AutomationCreateInput> & {
      templateExpenseId?: string
      templateTransactionId?: string
      _prefillScope?: string
      _prefillHouseId?: string
      _prefillHouseName?: string
      _prefillCategory?: string
    } = {
      type: 'recurring_transaction',
      schedule: { frequency: 'monthly', timeOfDay: '02:00', timezone: 'Australia/Sydney' },
    }

    if (scope) prefill._prefillScope = scope
    if (houseId) prefill._prefillHouseId = houseId
    if (houseName) {
      prefill._prefillHouseName = houseName
      prefill.name = `Recurring: ${houseName}`
    }
    if (category) prefill._prefillCategory = category

    return prefill
  }, [searchParams])

  // Auto-open create modal when navigated with ?new=true
  useEffect(() => {
    if (prefillFromParams) {
      setShowCreate(true)
      // Clean URL without reloading
      router.replace('/automations', { scroll: false })
    }
  }, [prefillFromParams])

  const fetchAutomations = useCallback(async () => {
    try {
      const res = await fetch('/api/automations')
      const json = (await res.json()) as { success: boolean; data?: Automation[] }
      if (json.success && json.data) setAutomations(json.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAutomations()
  }, [fetchAutomations])

  const handleToggle = async (id: string, isEnabled: boolean) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isEnabled: !isEnabled } : a)),
    )
    try {
      await fetch(`/api/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !isEnabled }),
      })
      fetchAutomations()
    } catch {
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isEnabled } : a)),
      )
    }
  }

  const handleRunNow = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    setRunningId(id)
    try {
      await fetch(`/api/automations/${id}/run-now`, { method: 'POST' })
      fetchAutomations()
    } catch {
      // silent
    } finally {
      setRunningId(null)
    }
  }

  // Filter
  const filtered = automations.filter((a) => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterType && a.type !== filterType) return false
    if (filterHealth) {
      const h = getAutomationHealth(a)
      if (h !== filterHealth) return false
    }
    return true
  })

  const counts = useSummaryCounts(automations)

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Zap className="w-5 h-5 text-indigo-600" />
            </div>
            Automations
          </h1>
          <p className="text-sm text-gray-500 mt-1.5 ml-[44px]">
            Scheduled jobs that run your business on autopilot.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Automation
        </button>
      </div>

      {/* Summary pills */}
      {!loading && automations.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setFilterHealth(filterHealth === '' ? '' : '')}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterHealth === ''
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All {counts.total}
          </button>
          <button
            onClick={() => setFilterHealth(filterHealth === 'active' ? '' : 'active')}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterHealth === 'active'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${filterHealth === 'active' ? 'bg-emerald-200' : 'bg-emerald-500'}`} />
              Active {counts.active}
            </span>
          </button>
          {counts.broken > 0 && (
            <button
              onClick={() => setFilterHealth(filterHealth === 'broken' ? '' : 'broken')}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterHealth === 'broken'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                Broken {counts.broken}
              </span>
            </button>
          )}
          {counts.disabled > 0 && (
            <button
              onClick={() => setFilterHealth(filterHealth === 'disabled' ? '' : 'disabled')}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterHealth === 'disabled'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Ban className="w-3 h-3" />
                Disabled {counts.disabled}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Search + type filter */}
      {!loading && automations.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search automations…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as AutomationType | '')}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
          >
            <option value="">All Types</option>
            <option value="recurring_transaction">Recurring Transaction</option>
            <option value="contract_billing_run">Contract Billing</option>
          </select>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 && automations.length === 0 ? (
        /* Empty state — no automations at all */
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No automations yet</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            Automations run tasks on a schedule — like generating recurring expenses, 
            or billing funding contracts nightly.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create your first automation
          </button>
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state — filters active */
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No automations match your filters</p>
          <button
            onClick={() => { setSearch(''); setFilterType(''); setFilterHealth('') }}
            className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Clear filters
          </button>
        </div>
      ) : (
        /* Automation cards */
        <div className="space-y-3">
          {filtered.map((a) => {
            const health = getAutomationHealth(a)
            const isBroken = health === 'broken'
            const isDisabled = health === 'disabled'

            return (
              <Link
                key={a.id}
                href={`/automations/${a.id}`}
                className={`block bg-white rounded-xl border transition-all hover:shadow-md group ${
                  isBroken
                    ? 'border-red-200 hover:border-red-300'
                    : isDisabled
                      ? 'border-gray-200 opacity-60 hover:opacity-80 hover:border-gray-300'
                      : 'border-gray-200 hover:border-indigo-200'
                }`}
              >
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Icon */}
                  <TypeIcon type={a.type} />

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-0.5">
                      <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                        {a.name}
                      </h3>
                      <HealthBadge health={health} />
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                      <span className={`font-medium ${
                        a.type === 'recurring_transaction' ? 'text-indigo-600' : 'text-amber-600'
                      }`}>
                        {AUTOMATION_TYPE_LABELS[a.type]}
                      </span>
                      <span className="text-gray-300">·</span>
                      <span>{describeSchedule(a.schedule)}</span>
                      {a.description && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="truncate max-w-[180px]">{a.description}</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Right side — timing + actions */}
                  <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
                    {/* Last/Next run info */}
                    <div className="text-right">
                      {a.lastRunAt ? (
                        <p className="text-xs text-gray-500">
                          Last ran{' '}
                          <span className="font-medium text-gray-700">
                            {formatRelativeDate(a.lastRunAt)}
                          </span>
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Never run</p>
                      )}
                      {a.isEnabled && a.nextRunAt && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Next{' '}
                          <span className="text-gray-600">
                            {formatRelativeDate(a.nextRunAt)}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Quick actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleRunNow(e, a.id)}
                        disabled={runningId === a.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                        title="Run Now"
                      >
                        {runningId === a.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                        Run
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleToggle(a.id, a.isEnabled)
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          a.isEnabled
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={a.isEnabled ? 'Disable' : 'Enable'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>

                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </div>

                {/* Broken warning banner */}
                {isBroken && (
                  <div className="px-5 py-2.5 bg-red-50 border-t border-red-100 rounded-b-xl flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-600">
                      Last run failed — check the run log for details.
                    </p>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      <CreateAutomationModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchAutomations}
        prefill={prefillFromParams || undefined}
      />
    </div>
  )
}
