'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Zap,
  Plus,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ToggleLeft,
  ToggleRight,
  Search,
  Loader2,
} from 'lucide-react'
import type { Automation, AutomationType } from 'types/automation'
import {
  AUTOMATION_TYPE_LABELS,
  describeSchedule,
} from 'types/automation'
import { CreateAutomationModal } from 'components/automations/CreateAutomationModal'

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        <Clock className="w-3 h-3" /> Never run
      </span>
    )
  }
  if (status === 'success') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle2 className="w-3 h-3" /> Success
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
      <XCircle className="w-3 h-3" /> Failed
    </span>
  )
}

function TypeBadge({ type }: { type: AutomationType }) {
  const isRecurring = type === 'recurring_transaction'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        isRecurring ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
      }`}
    >
      {isRecurring ? <RefreshCw className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
      {AUTOMATION_TYPE_LABELS[type]}
    </span>
  )
}

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
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<AutomationType | ''>('')
  const [filterEnabled, setFilterEnabled] = useState<'' | 'enabled' | 'disabled'>('')
  const [runningId, setRunningId] = useState<string | null>(null)

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
    // Optimistic update
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
      // revert
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isEnabled } : a)),
      )
    }
  }

  const handleRunNow = async (id: string) => {
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
    if (filterEnabled === 'enabled' && !a.isEnabled) return false
    if (filterEnabled === 'disabled' && a.isEnabled) return false
    return true
  })

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-indigo-600" />
            Automations
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage recurring transactions, scheduled billing, and system jobs.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Automation
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search automations…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as AutomationType | '')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Types</option>
          <option value="recurring_transaction">Recurring Transaction</option>
          <option value="contract_billing_run">Contract Billing</option>
        </select>
        <select
          value={filterEnabled}
          onChange={(e) => setFilterEnabled(e.target.value as '' | 'enabled' | 'disabled')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Status</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <Zap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No automations found</p>
          <p className="text-sm text-gray-400 mt-1">
            Create your first automation to get started.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            New Automation
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                    Type
                  </th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                    Enabled
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                    Schedule
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                    Last Run
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                    Next Run
                  </th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/automations/${a.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                      >
                        {a.name}
                      </Link>
                      {a.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                          {a.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={a.type} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(a.id, a.isEnabled)}
                        className="transition-colors"
                        title={a.isEnabled ? 'Disable' : 'Enable'}
                      >
                        {a.isEnabled ? (
                          <ToggleRight className="w-6 h-6 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-gray-300" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {describeSchedule(a.schedule)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatRelativeDate(a.lastRunAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {a.isEnabled ? formatRelativeDate(a.nextRunAt) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={a.lastRunStatus} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRunNow(a.id)}
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
                        <Link
                          href={`/automations/${a.id}`}
                          className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <CreateAutomationModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchAutomations}
      />
    </div>
  )
}

