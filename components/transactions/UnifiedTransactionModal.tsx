"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "react-hot-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "components/ui/Dialog"
import { Input } from "components/ui/Input"
import {
  PROPERTY_CATEGORY_LABELS,
  ORGANISATION_CATEGORY_LABELS,
  EXPENSE_FREQUENCY_LABELS,
  type ExpenseScope,
  type PropertyExpenseCategory,
  type OrganisationExpenseCategory,
  type ExpenseFrequency,
} from "types/house-expense"
import type { FundingInformation } from "types/resident"
import type { TransactionCreateInput } from "types/transaction"
import { CreateAutomationModal } from "components/automations/CreateAutomationModal"

/* ═══════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════ */
type Direction = "income" | "expense"

interface UnifiedTransactionModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  /** Pre-select direction */
  defaultDirection?: Direction
  /** Pre-select scope (for house-page shortcut) */
  defaultScope?: ExpenseScope
  /** Pre-select house (for house-page shortcut) */
  defaultHouseId?: string
}

/* ═══════════════════════════════════════════════════════════
   Expense form schema
   ═══════════════════════════════════════════════════════════ */
const PROPERTY_CATS = [
  'head_lease', 'utilities', 'maintenance', 'cleaning', 'insurance',
  'compliance', 'repairs', 'other', 'rent', 'rates', 'management_fee',
] as const

const ORG_CATS = [
  'salaries', 'software', 'office_rent', 'marketing', 'accounting',
  'corporate_insurance', 'vehicles', 'other',
] as const

const ALL_CATS = [...PROPERTY_CATS, ...ORG_CATS] as const

const expenseSchema = z.object({
  scope: z.enum(['property', 'organisation']),
  houseId: z.string().optional().or(z.literal('')),
  category: z.enum(ALL_CATS),
  description: z.string().min(1, 'Description is required'),
  supplier: z.string().optional().or(z.literal('')),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  frequency: z.enum(['one_off', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'annually']).optional(),
  occurredAt: z.coerce.date(),
  dueDate: z.coerce.date().optional().nullable(),
  reference: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  status: z.enum(['draft', 'approved', 'paid']),
})

type ExpenseFormData = z.infer<typeof expenseSchema>

/* ═══════════════════════════════════════════════════════════
   Income form schema (NDIS drawdown — same as existing)
   ═══════════════════════════════════════════════════════════ */
const incomeSchema = z.object({
  residentId: z.string().min(1, "Please select a resident"),
  contractId: z.string().min(1, "Please select a contract"),
  occurredAt: z.coerce.date(),
  serviceCode: z.string().optional(),
  note: z.string().optional(),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().nonnegative("Unit price must be non-negative"),
  amount: z.number().nonnegative().optional(),
})

type IncomeFormData = z.infer<typeof incomeSchema>

/* ═══════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════ */
function advanceDateByFrequency(dateStr: string, frequency: ExpenseFrequency): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return dateStr
  switch (frequency) {
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'fortnightly': d.setDate(d.getDate() + 14); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'quarterly': d.setMonth(d.getMonth() + 3); break
    case 'annually': d.setFullYear(d.getFullYear() + 1); break
    default: d.setMonth(d.getMonth() + 1); break
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function friendlyMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
}

/* ═══════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════ */
export function UnifiedTransactionModal({
  open,
  onClose,
  onSuccess,
  defaultDirection = "expense",
  defaultScope = "property",
  defaultHouseId,
}: UnifiedTransactionModalProps) {
  const [direction, setDirection] = useState<Direction>(defaultDirection)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createCount, setCreateCount] = useState(0)

  // ── Houses for property selector ──
  const [houses, setHouses] = useState<{ id: string; name: string }[]>([])
  const [housesLoading, setHousesLoading] = useState(true)

  // ── Income: residents + contracts ──
  const [residents, setResidents] = useState<any[]>([])
  const [allHouses, setAllHouses] = useState<any[]>([])
  const [fundingContracts, setFundingContracts] = useState<Record<string, FundingInformation[]>>({})
  const [incomeLoading, setIncomeLoading] = useState(false)
  const [lastEditedField, setLastEditedField] = useState<'quantity' | 'unitPrice' | 'amount' | null>(null)

  // ── Create & Next for expenses ──
  const [createAndNext, setCreateAndNext] = useState(false)

  // ── Make recurring / automation wizard ──
  const [makeRecurring, setMakeRecurring] = useState(false)
  const [showAutomationWizard, setShowAutomationWizard] = useState(false)
  const [lastCreatedExpenseId, setLastCreatedExpenseId] = useState<string | null>(null)

  // ── Expense form ──
  const expenseForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      scope: defaultScope,
      houseId: defaultHouseId || '',
      category: defaultScope === 'property' ? 'head_lease' : 'salaries',
      description: '',
      supplier: '',
      amount: 0,
      frequency: 'one_off',
      occurredAt: new Date(),
      status: 'draft',
      reference: '',
      notes: '',
    },
  })

  // ── Income form ──
  const incomeForm = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      occurredAt: new Date(),
      quantity: 1,
      unitPrice: 0,
      amount: 0,
    },
  })

  const watchedScope = expenseForm.watch('scope')
  const watchedExpenseDate = expenseForm.watch('occurredAt')
  const watchedFrequency = expenseForm.watch('frequency')

  const watchedResidentId = incomeForm.watch('residentId')
  const watchedContractId = incomeForm.watch('contractId')
  const watchedQuantity = incomeForm.watch('quantity')
  const watchedUnitPrice = incomeForm.watch('unitPrice')
  const watchedAmount = incomeForm.watch('amount')

  // ── Fetch houses ──
  useEffect(() => {
    if (!open) return
    setHousesLoading(true)
    fetch('/api/houses?limit=100')
      .then(r => r.json() as Promise<{ success: boolean; data?: any[] }>)
      .then(json => {
        if (json.success && json.data) {
          const mapped = json.data.map((h: any) => ({
            id: h.id,
            name: h.descriptor || h.address1 || h.suburb || 'Unknown',
          }))
          setHouses(mapped)
          setAllHouses(json.data)
        }
      })
      .catch(() => {})
      .finally(() => setHousesLoading(false))
  }, [open])

  // ── Fetch residents for income mode ──
  useEffect(() => {
    if (!open || direction !== 'income') return
    setIncomeLoading(true)
    Promise.all([
      fetch('/api/residents?limit=100').then(r => r.json() as Promise<{ success: boolean; data?: any[] }>),
      fetch('/api/houses?limit=100').then(r => r.json() as Promise<{ success: boolean; data?: any[] }>),
    ]).then(([resResult, housesResult]) => {
      if (resResult.success && housesResult.success) {
        const allR = resResult.data || []
        const allH = housesResult.data || []
        // Filter to eligible residents (active, with active contract + balance)
        const eligible = allR.filter((r: any) => {
          if (r.status !== 'Active' || !r.houseId) return false
          const contracts = r.funding_contracts || []
          return contracts.some((c: any) => c.contract_status === 'Active' && c.current_balance > 0)
        }).map((r: any) => ({
          ...r,
          house: allH.find((h: any) => h.id === r.houseId),
        }))
        setResidents(eligible)
      }
    }).catch(() => {}).finally(() => setIncomeLoading(false))
  }, [open, direction])

  // ── Load funding contracts when resident selected ──
  useEffect(() => {
    if (watchedResidentId && !fundingContracts[watchedResidentId]) {
      fetch(`/api/residents/${watchedResidentId}/funding`)
        .then(r => r.json() as Promise<{ success: boolean; data?: any[] }>)
        .then(result => {
          if (result.success && result.data) {
            setFundingContracts(prev => ({ ...prev, [watchedResidentId]: result.data || [] }))
          }
        })
        .catch(() => {})
    }
  }, [watchedResidentId, fundingContracts])

  // ── Income: smart amount derivation ──
  useEffect(() => {
    if (lastEditedField === 'quantity' || lastEditedField === 'unitPrice') {
      const qty = watchedQuantity || 0
      const price = watchedUnitPrice || 0
      incomeForm.setValue('amount', Math.round(qty * price * 100) / 100, { shouldValidate: false })
    }
  }, [watchedQuantity, watchedUnitPrice, lastEditedField, incomeForm])

  useEffect(() => {
    if (lastEditedField === 'amount') {
      incomeForm.setValue('quantity', 1, { shouldValidate: false })
      incomeForm.setValue('unitPrice', watchedAmount || 0, { shouldValidate: false })
    }
  }, [watchedAmount, lastEditedField, incomeForm])

  // ── Reset contract when resident changes ──
  useEffect(() => {
    incomeForm.setValue('contractId', '')
  }, [watchedResidentId, incomeForm])

  // ── Auto due date (14 days after expense date) ──
  useEffect(() => {
    if (watchedExpenseDate && direction === 'expense') {
      const d = watchedExpenseDate instanceof Date ? watchedExpenseDate : new Date(watchedExpenseDate)
      if (!isNaN(d.getTime())) {
        const due = new Date(d)
        due.setDate(due.getDate() + 14)
        const yyyy = due.getFullYear()
        const mm = String(due.getMonth() + 1).padStart(2, '0')
        const dd = String(due.getDate()).padStart(2, '0')
        expenseForm.setValue('dueDate', `${yyyy}-${mm}-${dd}` as unknown as Date)
      }
    }
  }, [watchedExpenseDate, direction, expenseForm])

  // ── Reset forms when modal opens ──
  useEffect(() => {
    if (open) {
      setCreateCount(0)
      setError(null)
      setCreateAndNext(false)
      setDirection(defaultDirection)
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      expenseForm.reset({
        scope: defaultScope,
        houseId: defaultHouseId || '',
        category: defaultScope === 'property' ? 'head_lease' : 'salaries',
        description: '',
        supplier: '',
        amount: 0,
        frequency: 'one_off',
        occurredAt: todayStr as unknown as Date,
        status: 'draft',
        reference: '',
        notes: '',
      })
      incomeForm.reset({
        occurredAt: todayStr as unknown as Date,
        quantity: 1,
        unitPrice: 0,
        amount: 0,
      })
    }
  }, [open, defaultDirection, defaultScope, defaultHouseId, expenseForm, incomeForm])

  // ── Switch default category when scope changes ──
  useEffect(() => {
    if (watchedScope === 'property') {
      expenseForm.setValue('category', 'head_lease')
      if (defaultHouseId) expenseForm.setValue('houseId', defaultHouseId)
    } else {
      expenseForm.setValue('category', 'salaries')
      expenseForm.setValue('houseId', '')
    }
  }, [watchedScope, expenseForm, defaultHouseId])

  // ── Derived state ──
  const selectedResident = useMemo(
    () => residents.find(r => r.id === watchedResidentId),
    [residents, watchedResidentId]
  )
  const selectedResidentContracts = selectedResident ? (fundingContracts[selectedResident.id] || []) : []
  const availableContracts = selectedResidentContracts.filter((c: any) => c.contractStatus === 'Active') || []
  const selectedContract = selectedResidentContracts.find((c: any) => c.id === watchedContractId)

  const expenseDateStr = watchedExpenseDate as unknown as string
  const nextDatePreview = expenseDateStr && watchedFrequency
    ? friendlyMonth(advanceDateByFrequency(expenseDateStr, watchedFrequency as ExpenseFrequency))
    : null

  /* ── Submit expense ── */
  const handleExpenseSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          houseId: data.scope === 'property' ? data.houseId : null,
        }),
      })
      const result = await response.json() as { success: boolean; error?: string; data?: { id?: string } }
      if (!result.success) throw new Error(result.error || 'Failed to create expense')

      setCreateCount(prev => prev + 1)

      // If "Make recurring" is checked, open the automation wizard
      if (makeRecurring && result.data?.id) {
        setLastCreatedExpenseId(result.data.id)
        toast.success('Expense created — now set up the recurring schedule')
        setShowAutomationWizard(true)
        setMakeRecurring(false)
        return
      }

      if (createAndNext && data.occurredAt) {
        const dateStr = data.occurredAt instanceof Date
          ? `${data.occurredAt.getFullYear()}-${String(data.occurredAt.getMonth() + 1).padStart(2, '0')}-${String(data.occurredAt.getDate()).padStart(2, '0')}`
          : String(data.occurredAt)
        const nextDate = advanceDateByFrequency(dateStr, (data.frequency || 'monthly') as ExpenseFrequency)
        expenseForm.setValue('occurredAt', nextDate as unknown as Date)
        toast.success(`Expense created! Form advanced to ${friendlyMonth(nextDate)}.`, { duration: 2000 })
      } else {
        toast.success('Expense created')
        onSuccess()
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create expense')
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ── Submit income ── */
  const handleIncomeSubmit = async (data: IncomeFormData) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const calculatedAmount = data.amount || (data.quantity * data.unitPrice)
      const input: TransactionCreateInput = {
        ...data,
        occurredAt: data.occurredAt instanceof Date ? data.occurredAt : new Date(data.occurredAt),
        amount: calculatedAmount,
        serviceCode: data.serviceCode || '',
      }
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const result = await response.json() as { success: boolean; error?: string }
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to create transaction')

      toast.success('Income transaction created')
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transaction')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDone = () => {
    if (createCount > 0) onSuccess()
    onClose()
  }

  if (!open) return null

  return (
    <Dialog
      open={open}
      onClose={handleDone}
      className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl"
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>

        {/* ── Direction Toggle ── */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-5">
          <button
            type="button"
            onClick={() => setDirection('income')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              direction === 'income'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-1.5">↗</span> Income
          </button>
          <button
            type="button"
            onClick={() => setDirection('expense')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              direction === 'expense'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-1.5">↙</span> Expense
          </button>
        </div>

        {/* ═══════════════════════════════════════════
            EXPENSE FORM
            ═══════════════════════════════════════════ */}
        {direction === 'expense' && (
          <form onSubmit={expenseForm.handleSubmit(handleExpenseSubmit)} className="space-y-4">
            {/* Scope Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Scope *</label>
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => expenseForm.setValue('scope', 'property')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    watchedScope === 'property'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🏠 Property
                </button>
                <button
                  type="button"
                  onClick={() => expenseForm.setValue('scope', 'organisation')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    watchedScope === 'organisation'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🏢 Organisation
                </button>
              </div>
            </div>

            {/* Property selector (only for property scope) */}
            {watchedScope === 'property' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property *</label>
                <select
                  {...expenseForm.register('houseId')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  disabled={!!defaultHouseId}
                >
                  <option value="">Select a property…</option>
                  {houses.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
                {expenseForm.formState.errors.houseId && (
                  <p className="text-red-600 text-xs mt-1">{expenseForm.formState.errors.houseId.message}</p>
                )}
              </div>
            )}

            {/* Category + Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  {...expenseForm.register('category')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {watchedScope === 'property'
                    ? (Object.entries(PROPERTY_CATEGORY_LABELS) as [PropertyExpenseCategory, string][]).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))
                    : (Object.entries(ORGANISATION_CATEGORY_LABELS) as [OrganisationExpenseCategory, string][]).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))
                  }
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($) *</label>
                <Input
                  type="number"
                  step="0.01"
                  {...expenseForm.register('amount')}
                  placeholder="0.00"
                  className={expenseForm.formState.errors.amount ? 'border-red-500' : ''}
                />
                {expenseForm.formState.errors.amount && (
                  <p className="text-red-600 text-xs mt-1">{expenseForm.formState.errors.amount.message}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <Input
                {...expenseForm.register('description')}
                placeholder={watchedScope === 'property' ? 'e.g., Weekly rent payment' : 'e.g., Monthly software subscription'}
                className={expenseForm.formState.errors.description ? 'border-red-500' : ''}
              />
              {expenseForm.formState.errors.description && (
                <p className="text-red-600 text-xs mt-1">{expenseForm.formState.errors.description.message}</p>
              )}
            </div>

            {/* Date + Frequency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  {...expenseForm.register('occurredAt')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {expenseForm.formState.errors.occurredAt && (
                  <p className="text-red-600 text-xs mt-1">{expenseForm.formState.errors.occurredAt.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  {...expenseForm.register('frequency')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {(Object.entries(EXPENSE_FREQUENCY_LABELS) as [ExpenseFrequency, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Supplier + Reference (collapsible optional) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <Input
                  {...expenseForm.register('supplier')}
                  placeholder="Optional supplier name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Invoice #</label>
                <Input
                  {...expenseForm.register('reference')}
                  placeholder="e.g., INV-2026-001"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                {...expenseForm.register('notes')}
                rows={2}
                placeholder="Additional notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Create & Next toggle */}
            <div className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${createAndNext ? 'bg-indigo-50 border border-indigo-100' : 'bg-gray-50'}`}>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={createAndNext}
                  onChange={(e) => setCreateAndNext(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700">Create & Next</p>
                <p className="text-xs text-gray-500">
                  Keep the form open and advance the date to the next period
                  {nextDatePreview && createAndNext && <span className="font-medium"> → {nextDatePreview}</span>}
                </p>
              </div>
            </div>

            {/* Success banner */}
            {createCount > 0 && (
              <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-green-700 text-xs font-medium">
                  {createCount} expense{createCount > 1 ? 's' : ''} created
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Make Recurring */}
            <div className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${makeRecurring ? 'bg-indigo-50 border border-indigo-100' : 'bg-gray-50'}`}>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={makeRecurring}
                  onChange={(e) => setMakeRecurring(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
              </label>
              <div>
                <p className="text-sm font-medium text-gray-700">Make recurring</p>
                <p className="text-xs text-gray-500">
                  After creating, set up an automation to repeat this expense on a schedule
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleDone}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {createCount > 0 ? 'Done' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating…
                  </>
                ) : createAndNext ? (
                  <>Create & Next →</>
                ) : makeRecurring ? (
                  'Create & Set Up Recurring'
                ) : (
                  'Create Expense'
                )}
              </button>
            </div>
          </form>
        )}

        {/* ═══════════════════════════════════════════
            INCOME FORM (NDIS Drawdown)
            ═══════════════════════════════════════════ */}
        {direction === 'income' && (
          <form onSubmit={incomeForm.handleSubmit(handleIncomeSubmit)} className="space-y-4">
            {incomeLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                <p className="ml-2 text-sm text-gray-500">Loading residents…</p>
              </div>
            ) : (
              <>
                {/* Resident + Contract */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Resident *</label>
                    <select
                      {...incomeForm.register('residentId')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select a resident…</option>
                      {residents.map((r: any) => (
                        <option key={r.id} value={r.id}>
                          {r.firstName} {r.lastName} — {r.house?.descriptor || r.house?.address1 || 'Unknown'}
                        </option>
                      ))}
                    </select>
                    {incomeForm.formState.errors.residentId && (
                      <p className="text-red-600 text-xs mt-1">{incomeForm.formState.errors.residentId.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contract *</label>
                    {!selectedResident ? (
                      <select disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400">
                        <option>Select a resident first</option>
                      </select>
                    ) : availableContracts.length > 0 ? (
                      <select
                        {...incomeForm.register('contractId')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">Select a contract…</option>
                        {availableContracts.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.type} — ${c.currentBalance.toLocaleString()} remaining
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="px-3 py-2 border border-yellow-200 rounded-lg bg-yellow-50 text-sm text-yellow-700">
                        No active contracts available.
                      </div>
                    )}
                    {incomeForm.formState.errors.contractId && (
                      <p className="text-red-600 text-xs mt-1">{incomeForm.formState.errors.contractId.message}</p>
                    )}
                  </div>
                </div>

                {/* Context banner */}
                {selectedResident && selectedContract && (
                  <div className="flex items-center gap-4 bg-gray-50 rounded-lg px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                        {selectedResident.firstName?.[0]}{selectedResident.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{selectedResident.firstName} {selectedResident.lastName}</p>
                        <p className="text-gray-500 text-xs">{selectedResident.house?.descriptor || selectedResident.house?.address1}</p>
                      </div>
                    </div>
                    <div className="h-8 border-l border-gray-200" />
                    <div>
                      <p className="text-gray-500 text-xs">Balance</p>
                      <p className="font-semibold text-green-600">${selectedContract.currentBalance.toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {/* Date + Service Code */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Delivery *</label>
                    <input
                      type="date"
                      {...incomeForm.register('occurredAt')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Code</label>
                    <input
                      {...incomeForm.register('serviceCode')}
                      placeholder="e.g. SDA_RENT"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                  <textarea
                    {...incomeForm.register('note')}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of the service provided…"
                  />
                </div>

                {/* Pricing */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Pricing</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <div className="flex items-center">
                        <button type="button" onClick={() => { const c = incomeForm.getValues('quantity') || 1; incomeForm.setValue('quantity', Math.max(1, c - 1)); setLastEditedField('quantity') }} className="px-3 py-2 border border-gray-300 rounded-l-lg bg-white hover:bg-gray-50 text-gray-600 text-sm">−</button>
                        <input type="number" step="1" min="1" {...incomeForm.register('quantity', { valueAsNumber: true })} onChange={(e) => { incomeForm.register('quantity', { valueAsNumber: true }).onChange(e); setLastEditedField('quantity') }} className="w-full px-3 py-2 border-t border-b border-gray-300 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        <button type="button" onClick={() => { const c = incomeForm.getValues('quantity') || 1; incomeForm.setValue('quantity', c + 1); setLastEditedField('quantity') }} className="px-3 py-2 border border-gray-300 rounded-r-lg bg-white hover:bg-gray-50 text-gray-600 text-sm">+</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input type="number" step="0.01" min="0" {...incomeForm.register('unitPrice', { valueAsNumber: true })} onChange={(e) => { incomeForm.register('unitPrice', { valueAsNumber: true }).onChange(e); setLastEditedField('unitPrice') }} placeholder="0.00" className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount
                        {lastEditedField !== 'amount' && (watchedQuantity || 0) > 0 && (watchedUnitPrice || 0) > 0 && (
                          <span className="text-gray-400 font-normal ml-1">(auto)</span>
                        )}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input type="number" step="0.01" min="0" {...incomeForm.register('amount', { valueAsNumber: true })} onChange={(e) => { incomeForm.register('amount', { valueAsNumber: true }).onChange(e); setLastEditedField('amount') }} placeholder="0.00" className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                  <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1.5">
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating…
                      </>
                    ) : (
                      'Create Income'
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </DialogContent>

      {/* Automation Wizard (opened after expense creation when "Make recurring" is checked) */}
      <CreateAutomationModal
        open={showAutomationWizard}
        onClose={() => {
          setShowAutomationWizard(false)
          setLastCreatedExpenseId(null)
          onSuccess()
          onClose()
        }}
        onCreated={() => {
          toast.success('Recurring automation created!')
          onSuccess()
          onClose()
        }}
        prefill={{
          name: expenseForm.getValues('description') ? `Recurring: ${expenseForm.getValues('description')}` : 'Recurring Expense',
          type: 'recurring_transaction',
          schedule: {
            frequency: (expenseForm.getValues('frequency') as 'daily' | 'weekly' | 'monthly') || 'monthly',
            timeOfDay: '02:00',
            timezone: 'Australia/Sydney',
          },
          parameters: {
            templateExpenseId: lastCreatedExpenseId || undefined,
            scope: expenseForm.getValues('scope'),
          },
        }}
      />
    </Dialog>
  )
}

