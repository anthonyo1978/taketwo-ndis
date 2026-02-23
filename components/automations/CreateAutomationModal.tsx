'use client'

import { useState, useEffect } from 'react'
import { X, Zap, RefreshCw, Building2, Home, ChevronRight, ChevronLeft } from 'lucide-react'
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
import {
  PROPERTY_CATEGORY_LABELS,
  ORGANISATION_CATEGORY_LABELS,
  EXPENSE_FREQUENCY_LABELS,
  type PropertyExpenseCategory,
  type OrganisationExpenseCategory,
  type ExpenseScope,
  type ExpenseFrequency,
} from 'types/house-expense'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
  /** Pre-fill for "Make Recurring" flow (from expense form) or house page links */
  prefill?: Partial<AutomationCreateInput> & {
    templateExpenseId?: string
    templateTransactionId?: string
    /** Prefill hints from house page navigation */
    _prefillScope?: string
    _prefillHouseId?: string
    _prefillHouseName?: string
    _prefillCategory?: string
  }
}

type Step = 'type' | 'expense' | 'schedule'

export function CreateAutomationModal({ open, onClose, onCreated, prefill }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Are we in prefill mode (coming from expense form with a template)?
  const hasPrefill = !!prefill?.parameters && (
    (prefill.parameters as any).templateExpenseId ||
    (prefill.parameters as any).templateTransactionId
  )

  // Are we in house-prefill mode (coming from house page)?
  const hasHousePrefill = !!prefill?._prefillHouseId || !!prefill?._prefillScope

  // Step management — skip type step if we have house context
  const [step, setStep] = useState<Step>(hasPrefill ? 'schedule' : hasHousePrefill ? 'expense' : 'type')

  // ── Automation fields ──
  const [name, setName] = useState(prefill?.name || '')
  const [description, setDescription] = useState(prefill?.description || '')
  const [type, setType] = useState<AutomationType>(prefill?.type || 'recurring_transaction')
  const [frequency, setFrequency] = useState<ScheduleFrequency>(
    prefill?.schedule?.frequency || 'monthly',
  )
  const [timeOfDay, setTimeOfDay] = useState(prefill?.schedule?.timeOfDay || '02:00')
  const [dayOfWeek, setDayOfWeek] = useState<number>(prefill?.schedule?.dayOfWeek ?? 1)
  const [dayOfMonth, setDayOfMonth] = useState<number>(prefill?.schedule?.dayOfMonth ?? 1)

  // ── Expense template fields (for standalone creation) ──
  const [expenseScope, setExpenseScope] = useState<ExpenseScope>('property')
  const [houseId, setHouseId] = useState('')
  const [category, setCategory] = useState<string>('head_lease')
  const [expenseDescription, setExpenseDescription] = useState('')
  const [supplier, setSupplier] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [expenseFrequency, setExpenseFrequency] = useState<ExpenseFrequency>('monthly')

  // ── Houses ──
  const [houses, setHouses] = useState<{ id: string; name: string }[]>([])
  const [housesLoading, setHousesLoading] = useState(false)

  // Fetch houses when modal opens
  useEffect(() => {
    if (!open) return
    setHousesLoading(true)
    fetch('/api/houses?limit=100')
      .then((r) => r.json() as Promise<{ success: boolean; data?: any[] }>)
      .then((json) => {
        if (json.success && json.data) {
          setHouses(
            json.data.map((h: any) => ({
              id: h.id,
              name: h.descriptor || h.address1 || h.suburb || 'Unknown',
            })),
          )
        }
      })
      .catch(() => {})
      .finally(() => setHousesLoading(false))
  }, [open])

  // Reset state when modal closes/opens
  useEffect(() => {
    if (open) {
      setError('')
      setStep(hasPrefill ? 'schedule' : hasHousePrefill ? 'expense' : 'type')
      setName(prefill?.name || '')
      setDescription(prefill?.description || '')
      setType(prefill?.type || 'recurring_transaction')
      setFrequency(prefill?.schedule?.frequency || 'monthly')
      setTimeOfDay(prefill?.schedule?.timeOfDay || '02:00')
      setDayOfWeek(prefill?.schedule?.dayOfWeek ?? 1)
      setDayOfMonth(prefill?.schedule?.dayOfMonth ?? 1)
      // Use house-prefill values if coming from house page
      setExpenseScope((prefill?._prefillScope as ExpenseScope) || 'property')
      setHouseId(prefill?._prefillHouseId || '')
      setCategory(prefill?._prefillCategory || (prefill?._prefillScope === 'organisation' ? 'salaries' : 'head_lease'))
      setExpenseDescription('')
      setSupplier('')
      setAmount(0)
      setExpenseFrequency('monthly')
    }
  }, [open])

  if (!open) return null

  const categories =
    expenseScope === 'property'
      ? Object.entries(PROPERTY_CATEGORY_LABELS)
      : Object.entries(ORGANISATION_CATEGORY_LABELS)

  const canProceedFromType = type === 'contract_billing_run' || type === 'recurring_transaction'

  const canProceedFromExpense =
    expenseDescription.trim() &&
    amount > 0 &&
    category &&
    (expenseScope === 'organisation' || houseId)

  const handleTypeNext = () => {
    if (type === 'recurring_transaction' && !hasPrefill) {
      setStep('expense')
    } else {
      // Contract billing / daily_digest — skip expense, go to schedule
      setStep('schedule')
    }
  }

  const handleSubmit = async () => {
    setError('')
    setSaving(true)

    try {
      let templateExpenseId = (prefill?.parameters as any)?.templateExpenseId
      let templateTransactionId = (prefill?.parameters as any)?.templateTransactionId

      // If recurring_transaction without a prefilled template, create the template expense first
      if (type === 'recurring_transaction' && !templateExpenseId && !templateTransactionId) {
        const expensePayload = {
          scope: expenseScope,
          houseId: expenseScope === 'property' ? houseId : null,
          category,
          description: expenseDescription,
          supplier: supplier || undefined,
          amount,
          frequency: expenseFrequency,
          occurredAt: new Date().toISOString(),
          status: 'approved' as const,
          notes: 'Template expense for recurring automation',
        }

        const expRes = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expensePayload),
        })

        if (!expRes.ok) {
          const errData = (await expRes.json()) as { error?: string }
          throw new Error(errData.error || 'Failed to create template expense')
        }

        const expData = (await expRes.json()) as { success: boolean; data?: { id: string } }
        if (!expData.success || !expData.data?.id) {
          throw new Error('Failed to create template expense')
        }

        templateExpenseId = expData.data.id
      }

      // Build automation name
      const autoName =
        name ||
        (type === 'recurring_transaction'
          ? `Recurring: ${expenseDescription || 'Expense'}`
          : type === 'daily_digest'
            ? 'Haven Daily Brief'
            : 'Contract Billing Run')

      // Build parameters
      const parameters: Record<string, any> = {}
      if (type === 'recurring_transaction') {
        if (templateExpenseId) parameters.templateExpenseId = templateExpenseId
        if (templateTransactionId) parameters.templateTransactionId = templateTransactionId
        if (expenseScope) parameters.scope = expenseScope
        // Spread any existing prefill parameters
        if (prefill?.parameters) Object.assign(parameters, prefill.parameters)
        // Override with our template if we just created one
        if (templateExpenseId && !hasPrefill) parameters.templateExpenseId = templateExpenseId
      } else if (type === 'daily_digest') {
        parameters.lookbackDays = 1
        parameters.forwardDays = 7
      }

      const payload: AutomationCreateInput = {
        name: autoName,
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
        parameters,
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 rounded-lg">
              <Zap className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {step === 'type' && 'New Automation'}
                {step === 'expense' && 'Expense Template'}
                {step === 'schedule' && (hasPrefill ? 'Create Automation' : 'Schedule')}
              </h2>
              {hasHousePrefill && prefill?._prefillHouseName && step === 'expense' && (
                <p className="text-xs text-gray-500 mt-0.5">
                  for {prefill._prefillHouseName}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Step indicator */}
            {!hasPrefill && (
              <div className="flex items-center gap-1.5">
                {(['type', type === 'recurring_transaction' ? 'expense' : null, 'schedule'] as (Step | null)[])
                  .filter(Boolean)
                  .map((s, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        s === step ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                    />
                  ))}
              </div>
            )}
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* ═══ STEP 1: Type Selection ═══ */}
          {step === 'type' && (
            <div className="space-y-5">
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  What kind of automation do you want to create?
                </p>

                <div className="space-y-3">
                  {/* Recurring Transaction */}
                  <button
                    type="button"
                    onClick={() => setType('recurring_transaction')}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      type === 'recurring_transaction'
                        ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg flex-shrink-0">
                        <RefreshCw className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Recurring Expense</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Automatically create an expense on a schedule — for a house or the organisation.
                        </p>
                      </div>
                    </div>
                    {type === 'recurring_transaction' && (
                      <div className="mt-3 pt-3 border-t border-indigo-200 flex items-center gap-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpenseScope('property')
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            expenseScope === 'property'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <Home className="w-3.5 h-3.5" />
                          House Expense
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpenseScope('organisation')
                            setCategory('salaries')
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            expenseScope === 'organisation'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          Organisation Expense
                        </button>
                      </div>
                    )}
                  </button>

                  {/* Contract Billing */}
                  <button
                    type="button"
                    onClick={() => setType('contract_billing_run')}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      type === 'contract_billing_run'
                        ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                        <Zap className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Contract Billing</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Scan funding contracts and generate NDIS drawdown transactions nightly.
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Daily Brief */}
                  <button
                    type="button"
                    onClick={() => { setType('daily_digest'); setFrequency('daily'); setTimeOfDay('06:00') }}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      type === 'daily_digest'
                        ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-sky-100 rounded-lg flex-shrink-0">
                        <Zap className="w-5 h-5 text-sky-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Daily Brief</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Executive morning email — yesterday&apos;s financials, upcoming activity, and alerts.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleTypeNext}
                  disabled={!canProceedFromType}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: Expense Template ═══ */}
          {step === 'expense' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg mb-1">
                {expenseScope === 'property' ? (
                  <Home className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Building2 className="w-4 h-4 text-indigo-600" />
                )}
                <span className="text-xs font-medium text-indigo-700">
                  {expenseScope === 'property' ? 'House Expense' : 'Organisation Expense'} Template
                </span>
                <button
                  type="button"
                  onClick={() => setStep('type')}
                  className="ml-auto text-xs text-indigo-600 hover:text-indigo-700"
                >
                  Change
                </button>
              </div>

              {/* House selector (property scope only) */}
              {expenseScope === 'property' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">House *</label>
                  <select
                    value={houseId}
                    onChange={(e) => setHouseId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select a house…</option>
                    {housesLoading ? (
                      <option disabled>Loading…</option>
                    ) : (
                      houses.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {categories.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input
                  type="text"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  placeholder="e.g. Monthly rent payment"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Supplier + Amount row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amount || ''}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Auto-set name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Automation Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    expenseDescription
                      ? `Recurring: ${expenseDescription}`
                      : 'e.g. Monthly Rent — 123 Smith St'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Leave blank to auto-generate from description.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('type')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep('schedule')}
                  disabled={!canProceedFromExpense}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Schedule ═══ */}
          {step === 'schedule' && (
            <div className="space-y-5">
              {/* Summary of what we're automating */}
              {!hasPrefill && type === 'recurring_transaction' && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    {expenseScope === 'property' ? (
                      <Home className="w-4 h-4 text-indigo-500" />
                    ) : (
                      <Building2 className="w-4 h-4 text-indigo-500" />
                    )}
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {expenseScope === 'property' ? 'House' : 'Organisation'} Expense
                    </span>
                  </div>
                  <div className="text-sm text-gray-900 font-medium">{expenseDescription}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">${amount.toFixed(2)}</span>
                    {supplier && <span>· {supplier}</span>}
                    {expenseScope === 'property' && houseId && (
                      <span>· {houses.find((h) => h.id === houseId)?.name}</span>
                    )}
                  </div>
                </div>
              )}

              {hasPrefill && (
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                  <p className="text-xs text-indigo-700 font-medium">
                    This automation will repeat the expense you just created on the schedule below.
                  </p>
                </div>
              )}

              {/* Name (if not already set) */}
              {hasPrefill && (
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
              )}

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

              {/* Schedule */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Schedule</label>

                <div className="grid grid-cols-2 gap-3">
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

              <div className="flex justify-between pt-2">
                {!hasPrefill ? (
                  <button
                    type="button"
                    onClick={() =>
                      setStep(type === 'recurring_transaction' ? 'expense' : 'type')
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving || (!name && !expenseDescription)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Creating…' : 'Create Automation'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
