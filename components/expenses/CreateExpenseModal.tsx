"use client"

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { houseExpenseSchema, type HouseExpenseSchemaType } from 'lib/schemas/house-expense'
import { Input } from 'components/ui/Input'
import type { HeadLease } from 'types/head-lease'
import type { Supplier } from 'types/supplier'
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_FREQUENCY_LABELS,
  type ExpenseCategory,
  type ExpenseFrequency,
} from 'types/house-expense'

interface CreateExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  houseId: string
  /** If a head lease exists, pre-fill rent details */
  headLease?: HeadLease | null
  /** If a supplier is provided, pre-fill maintenance/supplier details */
  supplier?: Supplier | null
  /** Default category override */
  defaultCategory?: ExpenseCategory
}

export function CreateExpenseModal({ isOpen, onClose, onSuccess, houseId, headLease, supplier, defaultCategory }: CreateExpenseModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
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

  /** Map supplier type → expense category */
  const supplierTypeToCategory = (type?: string): ExpenseCategory => {
    if (!type) return 'maintenance'
    const lower = type.toLowerCase()
    if (lower.includes('cleaning')) return 'maintenance'
    if (lower.includes('security')) return 'other'
    return 'maintenance'
  }

  // Reset form when modal opens — pre-fill from supplier if provided
  useEffect(() => {
    if (isOpen) {
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      const todayStr = `${yyyy}-${mm}-${dd}`

      if (supplier) {
        // Pre-fill from supplier context
        const cat = defaultCategory || supplierTypeToCategory(supplier.supplierType)
        reset({
          houseId,
          status: 'draft',
          category: cat,
          frequency: 'one_off',
          description: `${supplier.supplierType || 'Service'} — ${supplier.name}`,
          reference: '',
          notes: '',
          documentUrl: '',
          occurredAt: todayStr as unknown as Date,
        })
      } else {
        reset({
          houseId,
          status: 'draft',
          category: defaultCategory || 'rent',
          frequency: 'weekly',
          description: '',
          reference: '',
          notes: '',
          documentUrl: '',
        })
      }
    }
  }, [isOpen, houseId, reset, supplier, defaultCategory])

  // Pre-fill from head lease when category is 'rent'
  const prefillFromLease = () => {
    if (!headLease) return
    setValue('category', 'rent')
    setValue('description', `Rent — ${headLease.reference || 'Head Lease'}`)
    setValue('amount', headLease.rentAmount || 0)
    setValue('headLeaseId', headLease.id)
    // Map lease frequency to expense frequency
    const freqMap: Record<string, ExpenseFrequency> = {
      weekly: 'weekly',
      fortnightly: 'fortnightly',
      monthly: 'monthly',
    }
    if (headLease.rentFrequency && freqMap[headLease.rentFrequency]) {
      setValue('frequency', freqMap[headLease.rentFrequency])
    }
    // Set occurred_at to today
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    setValue('occurredAt', `${yyyy}-${mm}-${dd}` as unknown as Date)
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

      toast.success('Expense created successfully')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating expense:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create expense')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">New Expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" type="button">
            <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quick-fill from lease */}
        {headLease && headLease.rentAmount && !supplier && (
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

        {/* Supplier context banner */}
        {supplier && (
          <div className="mx-6 mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-3">
            <div className="p-1.5 bg-purple-100 rounded-lg">
              <svg className="size-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.42 15.17l-5.384-3.19A1.998 1.998 0 014 10.16V6a2 2 0 012-2h12a2 2 0 012 2v4.16c0 .712-.382 1.37-1.003 1.724l-5.384 3.19a2 2 0 01-2.043.042z" />
              </svg>
            </div>
            <div className="text-sm text-purple-800">
              <strong>{supplier.name}</strong>
              {supplier.supplierType && <span className="text-purple-600 ml-1">({supplier.supplierType})</span>}
              {supplier.contactName && <span className="text-purple-500 ml-1">· {supplier.contactName}</span>}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <input type="hidden" {...register('houseId')} />
          <input type="hidden" {...register('headLeaseId')} />

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

          {/* Date + Reference */}
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

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

