"use client"

import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { houseExpenseSchema, type HouseExpenseSchemaType } from 'lib/schemas/house-expense'
import { Input } from 'components/ui/Input'
import type { HeadLease } from 'types/head-lease'
import type { HouseSupplierWithDetails } from 'types/house-supplier'
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_FREQUENCY_LABELS,
  type ExpenseCategory,
  type ExpenseFrequency,
} from 'types/house-expense'

/** Data used to pre-fill the form when duplicating an existing expense */
export interface DuplicateExpenseData {
  category: ExpenseCategory
  description: string
  reference?: string
  amount: number
  frequency?: ExpenseFrequency
  notes?: string
  headLeaseId?: string
  isSnapshot?: boolean
  meterReading?: number
  readingUnit?: string
}

interface CreateExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  houseId: string
  /** If a head lease exists, pre-fill rent details */
  headLease?: HeadLease | null
  /** Default category override */
  defaultCategory?: ExpenseCategory
  /** Show a supplier picker dropdown in the form (fetches linked suppliers for this house) */
  showSupplierPicker?: boolean
  /** Enable the snapshot / meter-reading toggle (for utility expenses) */
  enableSnapshot?: boolean
  /** Pre-fill the form from an existing expense (duplicate mode) */
  duplicateFrom?: DuplicateExpenseData | null
}

// ─── Helpers ────────────────────────────────────────────────

/** Advance a date string (YYYY-MM-DD) by the given frequency interval. */
function advanceDateByFrequency(dateStr: string, frequency: ExpenseFrequency): string {
  const d = new Date(dateStr + 'T00:00:00') // parse as local
  if (isNaN(d.getTime())) return dateStr

  switch (frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7)
      break
    case 'fortnightly':
      d.setDate(d.getDate() + 14)
      break
    case 'monthly':
      d.setMonth(d.getMonth() + 1)
      break
    case 'quarterly':
      d.setMonth(d.getMonth() + 3)
      break
    case 'annually':
      d.setFullYear(d.getFullYear() + 1)
      break
    case 'one_off':
    default:
      // For one-off, advance by 1 month as a sensible default
      d.setMonth(d.getMonth() + 1)
      break
  }

  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Format a YYYY-MM-DD string to a friendly label like "Apr 2025". */
function friendlyMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
}

// ─── Component ──────────────────────────────────────────────

export function CreateExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  houseId,
  headLease,
  defaultCategory,
  showSupplierPicker,
  enableSnapshot,
  duplicateFrom,
}: CreateExpenseModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
    getValues,
  } = useForm<HouseExpenseSchemaType>({
    resolver: zodResolver(houseExpenseSchema),
    defaultValues: {
      houseId,
      status: 'draft',
      category: defaultCategory || 'rent',
      frequency: 'weekly',
    },
  })

  const selectedCategory = watch('category')
  const watchIsSnapshot = watch('isSnapshot')
  const watchOccurredAt = watch('occurredAt')
  const watchFrequency = watch('frequency')

  // "Create & Next" mode — keeps modal open and advances dates
  const [createAndNext, setCreateAndNext] = useState(false)
  // Counter for how many expenses have been created in a chain
  const [chainCount, setChainCount] = useState(0)

  // Auto-populate due date to 14 days after expense date
  useEffect(() => {
    if (watchOccurredAt) {
      const expenseDate = new Date(watchOccurredAt)
      if (!isNaN(expenseDate.getTime())) {
        const dueDate = new Date(expenseDate)
        dueDate.setDate(dueDate.getDate() + 14)
        const yyyy = dueDate.getFullYear()
        const mm = String(dueDate.getMonth() + 1).padStart(2, '0')
        const dd = String(dueDate.getDate()).padStart(2, '0')
        setValue('dueDate', `${yyyy}-${mm}-${dd}` as unknown as Date)
      }
    }
  }, [watchOccurredAt, setValue])

  // Linked suppliers for the picker
  const [linkedSuppliers, setLinkedSuppliers] = useState<HouseSupplierWithDetails[]>([])
  const [suppliersLoading, setSuppliersLoading] = useState(false)

  // Fetch linked suppliers when the modal opens with showSupplierPicker
  useEffect(() => {
    if (isOpen && showSupplierPicker) {
      setSuppliersLoading(true)
      fetch(`/api/houses/${houseId}/suppliers`)
        .then(res => res.json() as Promise<{ success: boolean; data?: HouseSupplierWithDetails[] }>)
        .then((result) => {
          if (result.success) {
            setLinkedSuppliers(result.data || [])
          }
        })
        .catch(err => console.error('Error fetching suppliers:', err))
        .finally(() => setSuppliersLoading(false))
    }
  }, [isOpen, showSupplierPicker, houseId])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setChainCount(0)
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      const todayStr = `${yyyy}-${mm}-${dd}`

      if (duplicateFrom) {
        // Pre-fill from the expense being duplicated — leave date blank so user must set it
        reset({
          houseId,
          status: 'draft',
          category: duplicateFrom.category,
          description: duplicateFrom.description,
          reference: duplicateFrom.reference || '',
          amount: duplicateFrom.amount,
          frequency: duplicateFrom.frequency || 'one_off',
          notes: duplicateFrom.notes || '',
          documentUrl: '',
          occurredAt: undefined,
          headLeaseId: duplicateFrom.headLeaseId || undefined,
          isSnapshot: duplicateFrom.isSnapshot || false,
          meterReading: duplicateFrom.meterReading,
          readingUnit: duplicateFrom.readingUnit || '',
        })
      } else {
        reset({
          houseId,
          status: 'draft',
          category: defaultCategory || 'rent',
          frequency: (showSupplierPicker || enableSnapshot) ? 'one_off' : 'weekly',
          description: '',
          reference: '',
          notes: '',
          documentUrl: '',
          occurredAt: (showSupplierPicker || enableSnapshot) ? (todayStr as unknown as Date) : undefined,
          isSnapshot: false,
          meterReading: undefined,
          readingUnit: '',
        })
      }
    }
  }, [isOpen, houseId, reset, defaultCategory, showSupplierPicker, enableSnapshot, duplicateFrom])

  // Pre-fill from head lease when category is 'rent'
  const prefillFromLease = () => {
    if (!headLease) return
    setValue('category', 'rent')
    setValue('description', `Rent — ${headLease.reference || 'Head Lease'}`)
    setValue('amount', headLease.rentAmount || 0)
    setValue('headLeaseId', headLease.id)
    const freqMap: Record<string, ExpenseFrequency> = {
      weekly: 'weekly',
      fortnightly: 'fortnightly',
      monthly: 'monthly',
    }
    if (headLease.rentFrequency && freqMap[headLease.rentFrequency]) {
      setValue('frequency', freqMap[headLease.rentFrequency])
    }
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    setValue('occurredAt', `${yyyy}-${mm}-${dd}` as unknown as Date)
  }

  // Handle supplier selection — auto-fill description
  const handleSupplierChange = (supplierId: string) => {
    const link = linkedSuppliers.find(s => s.supplierId === supplierId)
    if (link) {
      const supplier = link.supplier
      setValue('description', `${supplier.supplierType || 'Service'} — ${supplier.name}`)
      setValue('category', enableSnapshot ? 'utilities' : 'maintenance')
      setValue('frequency', 'one_off')
    }
  }

  const onSubmit = async (data: HouseExpenseSchemaType) => {
    try {
      const response = await fetch(`/api/houses/${houseId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json() as { success: boolean; error?: string }

      if (!result.success) {
        throw new Error(result.error || 'Failed to create expense')
      }

      onSuccess()

      if (createAndNext) {
        // Advance the dates by frequency and keep the modal open
        const currentDate = getValues('occurredAt') as unknown as string
        const currentFreq = getValues('frequency') as ExpenseFrequency

        if (currentDate) {
          const nextDate = advanceDateByFrequency(currentDate, currentFreq)
          setValue('occurredAt', nextDate as unknown as Date)
          // Due date will auto-update via the useEffect above
        }

        setChainCount(prev => prev + 1)
        toast.success(
          `Expense created! Form advanced to ${currentDate ? friendlyMonth(advanceDateByFrequency(currentDate as string, currentFreq)) : 'next period'}.`,
          { duration: 2000 }
        )
      } else {
        toast.success('Expense created successfully')
        onClose()
      }
    } catch (error) {
      console.error('Error creating expense:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create expense')
    }
  }

  if (!isOpen) return null

  // Compute what the next period will be for the hint label
  const currentDateStr = watchOccurredAt as unknown as string
  const nextDatePreview = currentDateStr && watchFrequency
    ? friendlyMonth(advanceDateByFrequency(currentDateStr, watchFrequency as ExpenseFrequency))
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {duplicateFrom ? 'Duplicate Expense' : 'New Expense'}
            </h2>
            {chainCount > 0 && (
              <p className="text-xs text-green-600 mt-0.5">
                {chainCount} expense{chainCount !== 1 ? 's' : ''} created in this session
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" type="button">
            <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Duplicate banner */}
        {duplicateFrom && chainCount === 0 && (
          <div className="mx-6 mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2">
            <svg className="size-4 text-purple-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-purple-800">
              Pre-filled from existing expense. <strong>Update the date</strong> and any other fields, then create.
            </p>
          </div>
        )}

        {/* Quick-fill from lease */}
        {headLease && headLease.rentAmount && !showSupplierPicker && !duplicateFrom && chainCount === 0 && (
          <div className="mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="text-sm text-blue-800">
              <strong>Head Lease:</strong> ${headLease.rentAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })} / {headLease.rentFrequency}
              {headLease.reference && <span className="text-blue-600 ml-1">(Ref: {headLease.reference})</span>}
            </div>
            <button
              type="button"
              onClick={prefillFromLease}
              className="text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              Use Lease Details
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <input type="hidden" {...register('houseId')} />
          <input type="hidden" {...register('headLeaseId')} />

          {/* Supplier picker — only when showSupplierPicker is true */}
          {showSupplierPicker && (
            <div>
              <label htmlFor="supplierPicker" className="block text-sm font-medium text-gray-700 mb-1">
                Supplier
              </label>
              {suppliersLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Loading suppliers…
                </div>
              ) : linkedSuppliers.length > 0 ? (
                <select
                  id="supplierPicker"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  defaultValue=""
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">— None (general expense) —</option>
                  {linkedSuppliers.map((link) => (
                    <option key={link.supplierId} value={link.supplierId}>
                      {link.supplier.name}{link.supplier.supplierType ? ` (${link.supplier.supplierType})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-400 italic py-1">No suppliers linked to this house yet.</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Selecting a supplier auto-fills the description. You can still edit all fields.
              </p>
            </div>
          )}

          {/* Category + Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                {...register('category')}
                className={`w-full rounded-lg border ${errors.category ? 'border-red-500' : 'border-gray-300'} bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                disabled={isSubmitting}
              >
                {(Object.entries(EXPENSE_CATEGORY_LABELS) as [ExpenseCategory, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                {...register('status')}
                className={`w-full rounded-lg border ${errors.status ? 'border-red-500' : 'border-gray-300'} bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                disabled={isSubmitting}
              >
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
              </select>
              {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <Input
              id="description"
              {...register('description')}
              placeholder={selectedCategory === 'rent' ? 'e.g., Weekly rent payment' : 'e.g., Plumbing repair'}
              className={errors.description ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
          </div>

          {/* Amount + Frequency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount ($) <span className="text-red-500">*</span>
              </label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount')}
                placeholder="0.00"
                className={errors.amount ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
            </div>

            <div>
              <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-1">
                Frequency
              </label>
              <select
                id="frequency"
                {...register('frequency')}
                className={`w-full rounded-lg border ${errors.frequency ? 'border-red-500' : 'border-gray-300'} bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                disabled={isSubmitting}
              >
                {(Object.entries(EXPENSE_FREQUENCY_LABELS) as [ExpenseFrequency, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date + Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="occurredAt" className="block text-sm font-medium text-gray-700 mb-1">
                Invoice / Expense Date <span className="text-red-500">*</span>
              </label>
              <Input
                id="occurredAt"
                type="date"
                {...register('occurredAt')}
                className={errors.occurredAt ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {errors.occurredAt && <p className="mt-1 text-sm text-red-600">{errors.occurredAt.message}</p>}
            </div>

            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <Input
                id="dueDate"
                type="date"
                {...register('dueDate')}
                className={errors.dueDate ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Reference */}
          <div>
            <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-1">
              Reference / Invoice #
            </label>
            <Input
              id="reference"
              {...register('reference')}
              placeholder="e.g., INV-2026-001"
              disabled={isSubmitting}
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              {...register('notes')}
              rows={2}
              placeholder="Additional notes..."
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                errors.notes ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
          </div>

          {/* Snapshot / Meter Reading toggle — only for utility expenses */}
          {enableSnapshot && (
            <div className="border border-teal-200 bg-teal-50/50 rounded-lg p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isSnapshot')}
                  className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  disabled={isSubmitting}
                />
                <div>
                  <span className="text-sm font-medium text-teal-900">Include Meter Reading</span>
                  <p className="text-xs text-teal-600">Capture a point-in-time measurement (e.g. electricity meter, water meter)</p>
                </div>
              </label>

              {watchIsSnapshot && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label htmlFor="meterReading" className="block text-xs font-medium text-teal-800 mb-1">
                      Reading Value
                    </label>
                    <Input
                      id="meterReading"
                      type="number"
                      step="0.01"
                      {...register('meterReading')}
                      placeholder="e.g. 12345.67"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="readingUnit" className="block text-xs font-medium text-teal-800 mb-1">
                      Unit
                    </label>
                    <select
                      id="readingUnit"
                      {...register('readingUnit')}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      disabled={isSubmitting}
                    >
                      <option value="">Select unit…</option>
                      <option value="kWh">kWh (Electricity)</option>
                      <option value="kL">kL (Water)</option>
                      <option value="MJ">MJ (Gas)</option>
                      <option value="GB">GB (Internet)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Create & Next toggle ─── */}
          <div className="border border-indigo-200 bg-indigo-50/50 rounded-lg px-4 py-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={createAndNext}
                onChange={(e) => setCreateAndNext(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                disabled={isSubmitting}
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-indigo-900">Create & Next</span>
                <p className="text-xs text-indigo-600 mt-0.5">
                  After creating, keep the form open and auto-advance the date to the next period
                  {nextDatePreview && createAndNext && (
                    <span className="font-medium"> → {nextDatePreview}</span>
                  )}
                </p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-xs text-gray-400">
              {chainCount > 0 && `${chainCount} created`}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                disabled={isSubmitting}
              >
                {chainCount > 0 ? 'Done' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium inline-flex items-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                    Creating...
                  </>
                ) : createAndNext ? (
                  <>
                    Create & Next
                    {nextDatePreview && (
                      <span className="text-blue-200 text-xs">→ {nextDatePreview}</span>
                    )}
                  </>
                ) : (
                  'Create Expense'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
