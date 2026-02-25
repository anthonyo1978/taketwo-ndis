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
  Users,
  X,
  Globe,
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

/* ─── Run status badge ─── */
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

/* ─── Health badge ─── */
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

type Tab = 'config' | 'history'

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
  const [activeTab, setActiveTab] = useState<Tab>('config')

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
  const [scheduleTimezone, setScheduleTimezone] = useState('Australia/Sydney')

  // Recipients editing (daily_digest)
  const [editingRecipients, setEditingRecipients] = useState(false)
  const [recipientEmails, setRecipientEmails] = useState<string[]>([])
  const [recipientInput, setRecipientInput] = useState('')
  const [savingRecipients, setSavingRecipients] = useState(false)

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
        const s = autoJson.data.schedule
        setScheduleFreq(s.frequency || 'monthly')
        setScheduleTime(s.timeOfDay || '02:00')
        setScheduleDOW(s.dayOfWeek ?? 1)
        setScheduleDOM(s.dayOfMonth ?? 1)
        setScheduleTimezone(s.timezone || 'Australia/Sydney')

        const p = autoJson.data.parameters as any
        if (p?.recipientEmails && Array.isArray(p.recipientEmails)) {
          setRecipientEmails(p.recipientEmails)
        }

        const prms = autoJson.data.parameters as any
        if (prms?.templateExpenseId) {
          try {
            const expRes = await fetch(`/api/house-expenses/${prms.templateExpenseId}`)
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
      setActiveTab('history')
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
            timezone: scheduleTimezone,
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

  const handleSaveRecipients = async () => {
    setSavingRecipients(true)
    try {
      const existingParams = (automation?.parameters || {}) as Record<string, any>
      await fetch(`/api/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parameters: {
            ...existingParams,
            recipientEmails: recipientEmails.length > 0 ? recipientEmails : undefined,
          },
        }),
      })
      setEditingRecipients(false)
      fetchData()
    } finally {
      setSavingRecipients(false)
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
  const isDigest = automation.type === 'daily_digest'
  const level = getAutomationLevel(automation)
  const levelColors = LEVEL_COLORS[level]
  const health = getAutomationHealth(automation)
  const tz = automation.schedule.timezone || 'Australia/Sydney'
  const tzShort = tz.replace(/_/g, ' ').split('/').pop() || tz

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href="/automations"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Automations
      </Link>

      {/* ═══════════════════════════════════════════
          HEADER — horizontal, full width
          ═══════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ring-2 ring-offset-2 ${levelColors.ring} ${
                isRecurring ? 'bg-indigo-100' : isDigest ? 'bg-sky-100' : 'bg-amber-100'
              }`}
              title={`${LEVEL_LABELS[level]} level`}
            >
              {isRecurring ? (
                <RefreshCw className="w-5 h-5 text-indigo-600" />
              ) : isDigest ? (
                <Mail className="w-5 h-5 text-sky-600" />
              ) : (
                <Zap className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{automation.name}</h1>
              {automation.description && (
                <p className="text-sm text-gray-500">{automation.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${levelColors.bg} ${levelColors.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${levelColors.dot}`} />
                  {LEVEL_LABELS[level]}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  isRecurring ? 'bg-indigo-100 text-indigo-700' : isDigest ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {AUTOMATION_TYPE_LABELS[automation.type]}
                </span>
                <HealthBadge health={health} />
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
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          KEY INFO STRIP — horizontal tiles
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Schedule</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">{describeSchedule(automation.schedule)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Globe className="w-3 h-3" /> Timezone
          </p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">{tzShort}</p>
          <p className="text-[11px] text-gray-400">{tz}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Next Run</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">
            {automation.isEnabled
              ? automation.nextRunAt
                ? new Date(automation.nextRunAt).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : '—'
              : 'Disabled'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Last Run</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">
            {automation.lastRunAt
              ? new Date(automation.lastRunAt).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
              : 'Never'}
          </p>
          {automation.lastRunStatus && (
            <p className={`text-[11px] mt-0.5 font-medium ${automation.lastRunStatus === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
              {automation.lastRunStatus === 'success' ? '✓ Delivered' : '✗ Failed'}
            </p>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          DAILY BRIEF — status banner (only for daily_digest)
          ═══════════════════════════════════════════ */}
      {isDigest && (
        <div className={`rounded-xl border p-4 mb-4 ${
          !automation.isEnabled
            ? 'bg-gray-50 border-gray-200'
            : health === 'broken'
              ? 'bg-red-50 border-red-200'
              : recipientEmails.length === 0
                ? 'bg-amber-50 border-amber-200'
                : 'bg-sky-50 border-sky-200'
        }`}>
          <div className="flex items-start gap-3">
            <Mail className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
              !automation.isEnabled ? 'text-gray-400' : health === 'broken' ? 'text-red-500' : recipientEmails.length === 0 ? 'text-amber-500' : 'text-sky-600'
            }`} />
            <div className="flex-1 min-w-0">
              {!automation.isEnabled ? (
                <p className="text-sm text-gray-600">Daily Brief is <strong>disabled</strong>. No emails will be sent.</p>
              ) : recipientEmails.length === 0 ? (
                <p className="text-sm text-amber-700"><strong>No recipients configured.</strong> Add at least one email address below so the brief has somewhere to go.</p>
              ) : (
                <div>
                  <p className="text-sm text-sky-800">
                    <strong>Active</strong> — sending to {recipientEmails.length} {recipientEmails.length === 1 ? 'recipient' : 'recipients'} at {automation.schedule.timeOfDay || '06:00'} {tzShort}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {recipientEmails.map((email) => (
                      <span key={email} className="inline-flex items-center px-2 py-0.5 bg-white/70 text-sky-700 rounded-full text-xs font-medium border border-sky-200">
                        {email}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TABS — Configuration / Run History
          ═══════════════════════════════════════════ */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'config'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Settings2 className="w-4 h-4" />
            Configuration
          </span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <History className="w-4 h-4" />
            Run History
            {runs.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-gray-100 text-gray-500">
                {runs.length}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════
          TAB: Configuration
          ═══════════════════════════════════════════ */}
      {activeTab === 'config' && (
        <div className="space-y-4">

          {/* Schedule — full width horizontal card */}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        <option key={i} value={i}>{label}</option>
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
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Timezone</label>
                  <select
                    value={scheduleTimezone}
                    onChange={(e) => setScheduleTimezone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="Australia/Sydney">Australia/Sydney</option>
                    <option value="Australia/Melbourne">Australia/Melbourne</option>
                    <option value="Australia/Brisbane">Australia/Brisbane</option>
                    <option value="Australia/Perth">Australia/Perth</option>
                    <option value="Australia/Adelaide">Australia/Adelaide</option>
                    <option value="Australia/Darwin">Australia/Darwin</option>
                    <option value="Australia/Hobart">Australia/Hobart</option>
                    <option value="Pacific/Auckland">Pacific/Auckland</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-4 flex gap-2 pt-1">
                  <button
                    onClick={handleSaveSchedule}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save Schedule'}
                  </button>
                  <button
                    onClick={() => setEditingSchedule(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-6 flex-wrap text-sm">
                <div>
                  <span className="text-gray-500">Runs </span>
                  <span className="font-semibold text-gray-900">{describeSchedule(automation.schedule)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Globe className="w-3.5 h-3.5" />
                  <span className="font-medium text-gray-700">{tz}</span>
                </div>
              </div>
            )}
          </div>

          {/* Daily Brief — What's in the email */}
          {isDigest && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <Mail className="w-4 h-4 text-sky-500" />
                What&apos;s in the email
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Executive Summary</p>
                    <p className="text-xs text-gray-500 mt-0.5">3–5 bullet snapshot of yesterday&apos;s outcome, trend, occupancy and risk</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Yesterday&apos;s Performance</p>
                    <p className="text-xs text-gray-500 mt-0.5">Income, property costs, org costs, net result, 7-day trend</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Your Week Ahead</p>
                    <p className="text-xs text-gray-500 mt-0.5">Funding pipeline, upcoming costs, contract risk, projected net</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Risk &amp; Alerts</p>
                    <p className="text-xs text-gray-500 mt-0.5">Expiring contracts, failed automations, low balances</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Daily Brief — Recipients */}
          {isDigest && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-500" />
                  Recipients
                </h3>
                {!editingRecipients && (
                  <button
                    type="button"
                    onClick={() => setEditingRecipients(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Edit
                  </button>
                )}
              </div>

              {!editingRecipients ? (
                <div>
                  {recipientEmails.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {recipientEmails.map((email) => (
                        <div key={email} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                          <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-sky-600 uppercase">{email.charAt(0)}</span>
                          </div>
                          <span className="text-sm text-gray-700">{email}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 rounded-lg border border-amber-100">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <p className="text-xs text-amber-700">No recipients configured. Click <strong>Edit</strong> to add email addresses.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    Type an email and press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Enter</kbd> to add.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={recipientInput}
                      onChange={(e) => setRecipientInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault()
                          const email = recipientInput.trim().replace(/,$/g, '')
                          if (email && email.includes('@') && !recipientEmails.includes(email)) {
                            setRecipientEmails([...recipientEmails, email])
                            setRecipientInput('')
                          }
                        }
                      }}
                      placeholder="name@company.com"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const email = recipientInput.trim().replace(/,$/g, '')
                        if (email && email.includes('@') && !recipientEmails.includes(email)) {
                          setRecipientEmails([...recipientEmails, email])
                          setRecipientInput('')
                        }
                      }}
                      className="px-3 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {recipientEmails.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {recipientEmails.map((email) => (
                        <div key={email} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg group">
                          <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-sky-600 uppercase">{email.charAt(0)}</span>
                          </div>
                          <span className="text-sm text-gray-700">{email}</span>
                          <button
                            type="button"
                            onClick={() => setRecipientEmails(recipientEmails.filter((e) => e !== email))}
                            className="text-gray-300 hover:text-red-500 transition-colors ml-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRecipients(false)
                        const p = automation.parameters as any
                        setRecipientEmails(p?.recipientEmails || [])
                        setRecipientInput('')
                      }}
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveRecipients}
                      disabled={savingRecipients}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50"
                    >
                      {savingRecipients ? 'Saving…' : 'Save Recipients'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recurring Transaction — Template Expense */}
          {templateExpense && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                {templateExpense.scope === 'organisation' ? (
                  <Building2 className="w-4 h-4 text-indigo-500" />
                ) : (
                  <Home className="w-4 h-4 text-indigo-500" />
                )}
                Template Expense
              </h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    templateExpense.scope === 'organisation' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {templateExpense.scope === 'organisation' ? <Building2 className="w-3 h-3" /> : <Home className="w-3 h-3" />}
                    {templateExpense.scope === 'organisation' ? 'Organisation' : 'House'}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {EXPENSE_CATEGORY_LABELS[templateExpense.category] || templateExpense.category}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{templateExpense.description}</p>
                  {templateExpense.supplier && <p className="text-xs text-gray-500">{templateExpense.supplier}</p>}
                  {templateExpense.houseName && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Home className="w-3 h-3" /> {templateExpense.houseName}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-gray-900">${Number(templateExpense.amount).toFixed(2)}</span>
                  {templateExpense.frequency && templateExpense.frequency !== 'one_off' && (
                    <span className="text-xs text-gray-400 ml-1">/ {templateExpense.frequency}</span>
                  )}
                </div>
                <Link
                  href={templateExpense.houseId ? `/houses/${templateExpense.houseId}?tab=expenses` : '/expenses'}
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium whitespace-nowrap"
                >
                  View <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {/* Generic Parameters (for contract_billing_run or other types without special UI) */}
          {!isDigest && !templateExpense && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Settings2 className="w-4 h-4 text-gray-400" />
                Parameters
              </h3>
              {Object.keys(automation.parameters || {}).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(automation.parameters || {}).map(([key, value]) => (
                    <div key={key} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-0.5">{key}</p>
                      <p className="font-mono text-xs text-gray-700 break-all">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No parameters configured</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB: Run History
          ═══════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-200">
          {runs.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No runs yet</p>
              <p className="text-xs text-gray-400 mt-1">Click &quot;Run Now&quot; to execute this automation.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {runs.map((run) => (
                <div key={run.id} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <RunStatusBadge status={run.status} />
                      <span className="text-sm text-gray-700">{formatDate(run.startedAt)}</span>
                      <span className="text-xs text-gray-400">{formatDuration(run.startedAt, run.finishedAt)}</span>
                    </div>
                    {run.metrics && Object.keys(run.metrics).length > 0 && (
                      <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
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
                  {run.summary && (
                    <p className="text-xs text-gray-500 mt-1.5 pl-[76px]">{run.summary}</p>
                  )}
                  {run.error && (
                    <div className="mt-1.5 pl-[76px] flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>
                        {typeof run.error === 'string'
                          ? run.error
                          : (run.error as any)?.message || JSON.stringify(run.error)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════ */}

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
                {preflightLoading ? 'Checking…' : preflightResult?.canRun ? 'Ready to Run' : 'Cannot Run'}
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
                  <p className="text-xs text-gray-400 mt-3">This will execute the automation immediately and log the result.</p>
                )}
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowRunConfirm(false); setPreflightResult(null) }}
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
              This will permanently delete <strong>{automation.name}</strong> and all its run history. This action cannot be undone.
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
