"use client"

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { supplierSchema, type SupplierSchemaType } from 'lib/schemas/supplier'
import type { Supplier } from 'types/supplier'
import { Input } from 'components/ui/Input'

interface SupplierModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  supplier?: Supplier | null
  mode?: 'create' | 'edit'
}

export function SupplierModal({ isOpen, onClose, onSuccess, supplier, mode = 'create' }: SupplierModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<SupplierSchemaType>({
    resolver: zodResolver(supplierSchema),
    defaultValues: supplier ? {
      name: supplier.name,
      supplierType: supplier.supplierType,
      contactName: supplier.contactName || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      notes: supplier.notes || ''
    } : {}
  })

  useEffect(() => {
    if (isOpen && supplier) {
      reset({
        name: supplier.name,
        supplierType: supplier.supplierType,
        contactName: supplier.contactName || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        notes: supplier.notes || ''
      })
    } else if (isOpen && !supplier) {
      reset({})
    }
  }, [isOpen, supplier, reset])

  const onSubmit = async (data: SupplierSchemaType) => {
    try {
      const url = mode === 'edit' && supplier ? `/api/suppliers/${supplier.id}` : '/api/suppliers'
      const method = mode === 'edit' ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json() as { success: boolean; error?: string }

      if (!result.success) {
        throw new Error(result.error || 'Failed to save supplier')
      }

      toast.success(mode === 'edit' ? 'Supplier updated successfully' : 'Supplier created successfully')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving supplier:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save supplier')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'edit' ? 'Edit Supplier' : 'Add Supplier'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            type="button"
          >
            <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Supplier Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., ABC Plumbing Services"
              className={errors.name ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Supplier Type */}
          <div>
            <label htmlFor="supplierType" className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              id="supplierType"
              {...register('supplierType')}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.supplierType ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            >
              <option value="">Select type (optional)</option>
              <option value="General Maintenance">General Maintenance</option>
              <option value="Plumber">Plumber</option>
              <option value="Electrician">Electrician</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Landscaping">Landscaping</option>
              <option value="HVAC">HVAC</option>
              <option value="Security">Security</option>
              <option value="Other">Other</option>
            </select>
            {errors.supplierType && (
              <p className="mt-1 text-sm text-red-600">{errors.supplierType.message}</p>
            )}
          </div>

          {/* Contact Name */}
          <div>
            <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-1">
              Contact Name
            </label>
            <Input
              id="contactName"
              {...register('contactName')}
              placeholder="e.g., John Smith"
              className={errors.contactName ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {errors.contactName && (
              <p className="mt-1 text-sm text-red-600">{errors.contactName.message}</p>
            )}
          </div>

          {/* Email and Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="email@example.com"
                className={errors.email ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                placeholder="0400 000 000"
                className={errors.phone ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              {...register('notes')}
              rows={4}
              placeholder="Additional notes about this supplier..."
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.notes ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.notes && (
              <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update Supplier' : 'Create Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

