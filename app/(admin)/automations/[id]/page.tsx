'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Zap,
  RefreshCw,
  Play,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Power,
  Ban,
  Copy,
  Loader2,
  Calendar,
  Settings2,
  History,
  AlertTriangle,
  Home,
  Building2,
  ExternalLink,
  Mail,
} from 'lucide-react'
import type { Automation, AutomationRun, ScheduleFrequency, AutomationHealthStatus } from 'types/automation'
import {
  AUTOMATION_TYPE_LABELS,
  AUTOMATION_TYPE_DESCRIPTIONS,
  DAY_OF_WEEK_LABELS,
  describeSchedule,
  getAutomationHealth,
  getAutomationLevel,
  LEVEL_LABELS,
  LEVEL_COLORS,
} from 'types/automation'
import { EXPENSE_CATEGORY_LABELS } from 'types/house-expense'

/* ─── Run status badge (for individual run records) ─── */
function RunStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'success':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="w-3 h-3" /> Success
        </span>
      )
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle className="w-3 h-3" /> Failed
        </span>
      )
    case 'running':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <Loader2 className="w-3 h-3 animate-spin" /> Running
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
          <Clock className="w-3 h-3" /> {status}
        </span>
      )
  }
}

/* ─── Automation health badge (Active / Broken / Disabled) ─── */
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

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(start: Date | string, end: Date | string | null | undefined): string {
  if (!end) return '—'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms / 60_000)}m`
}

export default function AutomationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [automation, setAutomation] = useState<Automation | null>(null)
  const [runs, setRuns] = useState<AutomationRun[]>([])
  const [loading, setLoading] = useState(true)
  const [runningNow, setRunningNow] = useState(false)
  const [templateExpense, setTemplateExpense] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Run Now confirmation
  const [showRunConfirm, setShowRunConfirm] = useState(false)
  const [preflightLoading, setPreflightLoading] = useState(false)
  const [preflightResult, setPreflightResult] = useState<{
    canRun: boolean
    reason: string
    warnings?: string[]
  } | null>(null)

  // Schedule editing
  const [editingSchedule, setEditingSchedule] = useState(false)
  const [scheduleFreq, setScheduleFreq] = useState<ScheduleFrequency>('monthly')
  const [scheduleTime, setScheduleTime] = useState('02:00')
  const [scheduleDOW, setScheduleDOW] = useState(1)
  const [scheduleDOM, setScheduleDOM] = useState(1)

  const fetchData = useCallback(async () => {
    try {
      const [autoRes, runsRes] = await Promise.all([
        fetch(`/api/automations/${id}`),
        fetch(`/api/automations/${id}/runs`),
      ])
      const autoJson = (await autoRes.json()) as { success: boolean; data?: Automation }
      const runsJson = (await runsRes.json()) as { success: boolean; data?: AutomationRun[] }

      if (autoJson.success && autoJson.data) {
        setAutomation(autoJson.data)
        // Init schedule editing state
        const s = autoJson.data.schedule
        setScheduleFreq(s.frequency || 'monthly')
        setScheduleTime(s.timeOfDay || '02:00')
        setScheduleDOW(s.dayOfWeek ?? 1)
        setScheduleDOM(s.dayOfMonth ?? 1)

        // Fetch linked template expense if applicable
        const params = autoJson.data.parameters as any
        if (params?.templateExpenseId) {
          try {
            const expRes = await fetch(`/api/house-expenses/${params.templateExpenseId}`)
            const expJson = (await expRes.json()) as { success: boolean; data?: any }
            if (expJson.success && expJson.data) {
              setTemplateExpense(expJson.data)
            }
          } catch {
            // non-fatal
          }
        }
      }
      if (runsJson.success && runsJson.data) setRuns(runsJson.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleToggle = async () => {
    if (!automation) return
    const newEnabled = !automation.isEnabled
    setAutomation({ ...automation, isEnabled: newEnabled })
    await fetch(`/api/automations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnabled: newEnabled }),
    })
    fetchData()
  }

  const handleRunNowClick = async () => {
    // Open confirmation dialog and run preflight check
    setShowRunConfirm(true)
    setPreflightLoading(true)
    setPreflightResult(null)
    try {
      const res = await fetch(`/api/automations/${id}/run-now`)
      const json = (await res.json()) as { success: boolean; data?: { canRun: boolean; reason: string; warnings?: string[] } }
      if (json.success && json.data) {
        setPreflightResult(json.data)
      } else {
        setPreflightResult({ canRun: false, reason: 'Failed to check automation status.' })
      }
    } catch {
      setPreflightResult({ canRun: false, reason: 'Failed to reach the server.' })
    } finally {
      setPreflightLoading(false)
    }
  }

  const handleRunNowConfirm = async () => {
    setShowRunConfirm(false)
    setRunningNow(true)
    try {
      await fetch(`/api/automations/${id}/run-now`, { method: 'POST' })
      fetchData()
    } finally {
      setRunningNow(false)
    }
  }

  const handleSaveSchedule = async () => {
    setSaving(true)
    try {
      await fetch(`/api/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule: {
            frequency: scheduleFreq,
            timeOfDay: scheduleTime,
            timezone: 'Australia/Sydney',
            ...(scheduleFreq === 'weekly' ? { dayOfWeek: scheduleDOW } : {}),
            ...(scheduleFreq === 'monthly' ? { dayOfMonth: scheduleDOM } : {}),
          },
        }),
      })
      setEditingSchedule(false)
      fetchData()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await fetch(`/api/automations/${id}`, { method: 'DELETE' })
      router.push('/automations')
    } finally {
      setDeleting(false)
    }
  }

  const handleDuplicate = async () => {
    if (!automation) return
    try {
      await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${automation.name} (Copy)`,
          description: automation.description,
          type: automation.type,
          isEnabled: false,
          schedule: automation.schedule,
          parameters: automation.parameters,
        }),
      })
      router.push('/automations')
    } catch {
      // silent
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!automation) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Automation not found.</p>
        <Link href="/automations" className="text-indigo-600 hover:underline text-sm mt-2 inline-block">
          ← Back to Automations
        </Link>
      </div>
    )
  }

  const isRecurring = automation.type === 'recurring_transaction'
  const level = getAutomationLevel(automation)
  const levelColors = LEVEL_COLORS[level]

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Back */}
      <Link
        href="/automations"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Automations
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-xl ring-2 ring-offset-2 ${levelColors.ring} ${
              isRecurring ? 'bg-indigo-100' : automation.type === 'daily_digest' ? 'bg-sky-100' : 'bg-amber-100'
            }`}
            title={`${LEVEL_LABELS[level]} level`}
          >
            {isRecurring ? (
              <RefreshCw className="w-5 h-5 text-indigo-600" />
            ) : automation.type === 'daily_digest' ? (
              <Mail className="w-5 h-5 text-sky-600" />
            ) : (
              <Zap className="w-5 h-5 text-amber-600" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{automation.name}</h1>
            {automation.description && (
              <p className="text-sm text-gray-500 mt-0.5">{automation.description}</p>
            )}
            <div className="flex items-center gap-2.5 mt-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${levelColors.bg} ${levelColors.text}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${levelColors.dot}`} />
                {LEVEL_LABELS[level]}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  isRecurring ? 'bg-indigo-100 text-indigo-700' : automation.type === 'daily_digest' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {AUTOMATION_TYPE_LABELS[automation.type]}
              </span>
              <HealthBadge health={getAutomationHealth(automation)} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRunNowClick}
            disabled={runningNow}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {runningNow ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run Now
          </button>
          <button
            onClick={handleToggle}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              automation.isEnabled
                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            <Power className="w-4 h-4" />
            {automation.isEnabled ? 'Disable' : 'Enable'}
          </button>
          <button
            onClick={handleDuplicate}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — Overview + Schedule */}
        <div className="lg:col-span-1 space-y-6">
          {/* Overview Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Settings2 className="w-4 h-4 text-gray-400" />
              Overview
            </h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Type</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {AUTOMATION_TYPE_LABELS[automation.type]}
                </dd>
                <dd className="text-xs text-gray-400 mt-0.5">
                  {AUTOMATION_TYPE_DESCRIPTIONS[automation.type]}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Last Run</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{formatDate(automation.lastRunAt)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Next Run</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {automation.isEnabled ? formatDate(automation.nextRunAt) : 'Disabled'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{formatDate(automation.createdAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Schedule Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                Schedule
              </h3>
              {!editingSchedule && (
                <button
                  onClick={() => setEditingSchedule(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Edit
                </button>
              )}
            </div>

            {editingSchedule ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Frequency</label>
                  <select
                    value={scheduleFreq}
                    onChange={(e) => setScheduleFreq(e.target.value as ScheduleFrequency)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                {scheduleFreq === 'weekly' && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Day of Week</label>
                    <select
                      value={scheduleDOW}
                      onChange={(e) => setScheduleDOW(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {DAY_OF_WEEK_LABELS.map((label, i) => (
                        <option key={i} value={i}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {scheduleFreq === 'monthly' && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Day of Month</label>
                    <select
                      value={scheduleDOM}
                      onChange={(e) => setScheduleDOM(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveSchedule}
                    disabled={saving}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save Schedule'}
                  </button>
                  <button
                    onClick={() => setEditingSchedule(false)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-700 font-medium">
                {describeSchedule(automation.schedule)}
              </p>
            )}
          </div>

          {/* Linked Expense / Daily Brief Config / Parameters Card */}
          {automation.type === 'daily_digest' ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Mail className="w-4 h-4 text-sky-500" />
                Daily Brief Configuration
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Lookback</span>
                  <span className="font-medium text-gray-900">{(automation.parameters as any)?.lookbackDays ?? 1} day(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Outlook</span>
                  <span className="font-medium text-gray-900">{(automation.parameters as any)?.forwardDays ?? 7} day(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Recipients</span>
                  <span className="font-medium text-gray-900">All admin users</span>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Sends an executive financial summary to all admin users each morning. Includes yesterday&apos;s performance, 7-day outlook, and operational alerts.
                  </p>
                </div>
              </div>
            </div>
          ) : templateExpense ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                {templateExpense.scope === 'organisation' ? (
                  <Building2 className="w-4 h-4 text-indigo-500" />
                ) : (
                  <Home className="w-4 h-4 text-indigo-500" />
                )}
                Template Expense
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      templateExpense.scope === 'organisation'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {templateExpense.scope === 'organisation' ? (
                      <Building2 className="w-3 h-3" />
                    ) : (
                      <Home className="w-3 h-3" />
                    )}
                    {templateExpense.scope === 'organisation' ? 'Organisation' : 'House'}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {EXPENSE_CATEGORY_LABELS[templateExpense.category] || templateExpense.category}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-900">{templateExpense.description}</p>
                  {templateExpense.supplier && (
                    <p className="text-xs text-gray-500 mt-0.5">{templateExpense.supplier}</p>
                  )}
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-gray-900">
                    ${Number(templateExpense.amount).toFixed(2)}
                  </span>
                  {templateExpense.frequency && templateExpense.frequency !== 'one_off' && (
                    <span className="text-xs text-gray-400">/ {templateExpense.frequency}</span>
                  )}
                </div>

                {templateExpense.houseName && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Home className="w-3 h-3" />
                    {templateExpense.houseName}
                  </div>
                )}

                <Link
                  href={
                    templateExpense.houseId
                      ? `/houses/${templateExpense.houseId}?tab=expenses`
                      : '/expenses'
                  }
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-1"
                >
                  View expense
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Settings2 className="w-4 h-4 text-gray-400" />
                Parameters
              </h3>
              {Object.keys(automation.parameters || {}).length > 0 ? (
                <dl className="space-y-2 text-sm">
                  {Object.entries(automation.parameters || {}).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-gray-500 text-xs">{key}</dt>
                      <dd className="font-mono text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded mt-0.5 break-all">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-xs text-gray-400 italic">No parameters configured</p>
              )}
            </div>
          )}
        </div>

        {/* Right column — Runs Log */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <History className="w-4 h-4 text-gray-400" />
                Run History
              </h3>
              <span className="text-xs text-gray-400">{runs.length} run{runs.length !== 1 ? 's' : ''}</span>
            </div>

            {runs.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No runs yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Click "Run Now" to execute this automation.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {runs.map((run) => (
                  <div key={run.id} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <RunStatusBadge status={run.status} />
                        <span className="text-sm text-gray-700">
                          {formatDate(run.startedAt)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDuration(run.startedAt, run.finishedAt)}
                        </span>
                      </div>
                    </div>
                    {run.summary && (
                      <p className="text-xs text-gray-500 mt-1 ml-[76px]">{run.summary}</p>
                    )}
                    {run.error && (
                      <div className="mt-1.5 ml-[76px] flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>
                          {typeof run.error === 'string'
                            ? run.error
                            : (run.error as any)?.message || JSON.stringify(run.error)}
                        </span>
                      </div>
                    )}
                    {run.metrics && Object.keys(run.metrics).length > 0 && (
                      <div className="mt-1.5 ml-[76px] flex flex-wrap gap-3">
                        {Object.entries(run.metrics).map(([key, val]) => (
                          <span key={key} className="text-xs text-gray-500">
                            <span className="text-gray-400">{key}:</span>{' '}
                            <span className="font-medium text-gray-700">
                              {typeof val === 'number' && key.toLowerCase().includes('amount')
                                ? `$${val.toFixed(2)}`
                                : String(val)}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Run Now Confirmation */}
      {showRunConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-xl ${preflightResult?.canRun ? 'bg-indigo-100' : preflightLoading ? 'bg-gray-100' : 'bg-amber-100'}`}>
                {preflightLoading ? (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                ) : preflightResult?.canRun ? (
                  <Play className="w-5 h-5 text-indigo-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {preflightLoading
                  ? 'Checking…'
                  : preflightResult?.canRun
                    ? 'Ready to Run'
                    : 'Cannot Run'}
              </h3>
            </div>

            {preflightLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                <Loader2 className="w-4 h-4 animate-spin" />
                Validating automation conditions…
              </div>
            ) : preflightResult ? (
              <div className="mb-6">
                <p className={`text-sm ${preflightResult.canRun ? 'text-gray-600' : 'text-amber-700'}`}>
                  {preflightResult.reason}
                </p>
                {preflightResult.warnings && preflightResult.warnings.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {preflightResult.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-600 flex items-start gap-1.5">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {w}
                      </p>
                    ))}
                  </div>
                )}
                {preflightResult.canRun && (
                  <p className="text-xs text-gray-400 mt-3">
                    This will execute the automation immediately and log the result.
                  </p>
                )}
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRunConfirm(false)
                  setPreflightResult(null)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              {preflightResult?.canRun && (
                <button
                  onClick={handleRunNowConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Run Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-xl">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Automation?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              This will permanently delete <strong>{automation.name}</strong> and all its run history.
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

