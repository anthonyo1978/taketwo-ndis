'use client'

import { useState } from 'react'
import { X, Zap, RefreshCw } from 'lucide-react'
import type {
  AutomationType,
  AutomationCreateInput,
  ScheduleFrequency,
} from 'types/automation'
import {
  AUTOMATION_TYPE_LABELS,
  AUTOMATION_TYPE_DESCRIPTIONS,
  DAY_OF_WEEK_LABELS,
} from 'types/automation'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
  /** Pre-fill for "Make Recurring" flow */
  prefill?: Partial<AutomationCreateInput> & {
    templateExpenseId?: string
    templateTransactionId?: string
  }
}

export function CreateAutomationModal({ open, onClose, onCreated, prefill }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [name, setName] = useState(prefill?.name || '')
  const [description, setDescription] = useState(prefill?.description || '')
  const [type, setType] = useState<AutomationType>(prefill?.type || 'recurring_transaction')
  const [frequency, setFrequency] = useState<ScheduleFrequency>(
    prefill?.schedule?.frequency || 'monthly',
  )
  const [timeOfDay, setTimeOfDay] = useState(prefill?.schedule?.timeOfDay || '02:00')
  const [dayOfWeek, setDayOfWeek] = useState<number>(prefill?.schedule?.dayOfWeek ?? 1)
  const [dayOfMonth, setDayOfMonth] = useState<number>(prefill?.schedule?.dayOfMonth ?? 1)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const payload: AutomationCreateInput = {
        name,
        description: description || undefined,
        type,
        isEnabled: true,
        schedule: {
          frequency,
          timeOfDay,
          timezone: 'Australia/Sydney',
          ...(frequency === 'weekly' ? { dayOfWeek } : {}),
          ...(frequency === 'monthly' ? { dayOfMonth } : {}),
        },
        parameters: {
          ...(prefill?.parameters || {}),
        },
      }

      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error || 'Failed to create automation')
      }

      onCreated()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 rounded-lg">
              <Zap className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Create Automation</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Monthly Rent — 123 Smith St"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
            <div className="grid grid-cols-2 gap-3">
              {(['recurring_transaction', 'contract_billing_run'] as AutomationType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    type === t
                      ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {t === 'recurring_transaction' ? (
                      <RefreshCw className="w-4 h-4 text-indigo-500" />
                    ) : (
                      <Zap className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {AUTOMATION_TYPE_LABELS[t]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{AUTOMATION_TYPE_DESCRIPTIONS[t]}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Schedule</label>

            <div className="grid grid-cols-2 gap-3">
              {/* Frequency */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Time</label>
                <input
                  type="time"
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Day of week (weekly) */}
            {frequency === 'weekly' && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Day of Week</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
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

            {/* Day of month (monthly) */}
            {frequency === 'monthly' && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Day of Month</label>
                <select
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Number(e.target.value))}
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
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create Automation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

