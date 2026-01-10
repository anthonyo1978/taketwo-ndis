"use client"

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { headLeaseSchema, type HeadLeaseSchemaType } from 'lib/schemas/head-lease'
import type { HeadLease } from 'types/head-lease'
import type { Owner } from 'types/owner'
import { Input } from 'components/ui/Input'
import { OwnerModal } from 'components/owners/OwnerModal'

interface HeadLeaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  lease?: HeadLease | null
  houseId?: string
  mode?: 'create' | 'edit'
}

export function HeadLeaseModal({ isOpen, onClose, onSuccess, lease, houseId, mode = 'create' }: HeadLeaseModalProps) {
  const [owners, setOwners] = useState<Owner[]>([])
  const [loadingOwners, setLoadingOwners] = useState(false)
  const [showOwnerModal, setShowOwnerModal] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue
  } = useForm<HeadLeaseSchemaType>({
    resolver: zodResolver(headLeaseSchema),
    defaultValues: lease ? {
      houseId: lease.houseId,
      ownerId: lease.ownerId,
      reference: lease.reference || '',
      startDate: lease.startDate,
      endDate: lease.endDate || undefined,
      status: lease.status,
      rentAmount: lease.rentAmount || undefined,
      rentFrequency: lease.rentFrequency,
      reviewDate: lease.reviewDate || undefined,
      notes: lease.notes || '',
      documentUrl: lease.documentUrl || ''
    } : {
      houseId: houseId || '',
      status: 'active',
      rentFrequency: 'weekly'
    }
  })

  // Fetch owners
  useEffect(() => {
    if (isOpen) {
      fetchOwners()
    }
  }, [isOpen])

  const fetchOwners = async () => {
    setLoadingOwners(true)
    try {
      const response = await fetch('/api/owners')
      const result = await response.json()
      if (result.success) {
        setOwners(result.data)
      }
    } catch (error) {
      console.error('Error fetching owners:', error)
      toast.error('Failed to load owners')
    } finally {
      setLoadingOwners(false)
    }
  }

  useEffect(() => {
    if (isOpen && lease) {
      reset({
        houseId: lease.houseId,
        ownerId: lease.ownerId,
        reference: lease.reference || '',
        startDate: lease.startDate,
        endDate: lease.endDate || undefined,
        status: lease.status,
        rentAmount: lease.rentAmount || undefined,
        rentFrequency: lease.rentFrequency,
        reviewDate: lease.reviewDate || undefined,
        notes: lease.notes || '',
        documentUrl: lease.documentUrl || ''
      })
    } else if (isOpen && !lease) {
      reset({
        houseId: houseId || '',
        status: 'active',
        rentFrequency: 'weekly'
      })
    }
  }, [isOpen, lease, houseId, reset])

  const onSubmit = async (data: HeadLeaseSchemaType) => {
    try {
      const url = mode === 'edit' && lease ? `/api/head-leases/${lease.id}` : '/api/head-leases'
      const method = mode === 'edit' ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to save head lease')
      }

      toast.success(mode === 'edit' ? 'Lease updated successfully' : 'Lease created successfully')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving head lease:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save head lease')
    }
  }

  const handleOwnerCreated = () => {
    fetchOwners()
    setShowOwnerModal(false)
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'edit' ? 'Edit Head Lease' : 'Create Head Lease'}
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
            {/* Owner Selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="ownerId" className="block text-sm font-medium text-gray-700">
                  Owner <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowOwnerModal(true)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Create New Owner
                </button>
              </div>
              <select
                id="ownerId"
                {...register('ownerId')}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.ownerId ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting || loadingOwners}
              >
                <option value="">Select an owner...</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name} ({owner.ownerType})
                  </option>
                ))}
              </select>
              {errors.ownerId && (
                <p className="mt-1 text-sm text-red-600">{errors.ownerId.message}</p>
              )}
            </div>

            {/* Reference and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-1">
                  Lease Reference
                </label>
                <Input
                  id="reference"
                  {...register('reference')}
                  placeholder="e.g., LEASE-2024-001"
                  className={errors.reference ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.reference && (
                  <p className="mt-1 text-sm text-red-600">{errors.reference.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  id="status"
                  {...register('status')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.status ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                >
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="expired">Expired</option>
                </select>
                {errors.status && (
                  <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Input
                  id="startDate"
                  type="date"
                  {...register('startDate')}
                  className={errors.startDate ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <Input
                  id="endDate"
                  type="date"
                  {...register('endDate')}
                  className={errors.endDate ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                <p className="mt-1 text-xs text-gray-500">Leave empty for ongoing</p>
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="reviewDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Review Date
                </label>
                <Input
                  id="reviewDate"
                  type="date"
                  {...register('reviewDate')}
                  className={errors.reviewDate ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.reviewDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.reviewDate.message}</p>
                )}
              </div>
            </div>

            {/* Rent Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="rentAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  Rent Amount
                </label>
                <Input
                  id="rentAmount"
                  type="number"
                  step="0.01"
                  {...register('rentAmount')}
                  placeholder="e.g., 500.00"
                  className={errors.rentAmount ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.rentAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.rentAmount.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="rentFrequency" className="block text-sm font-medium text-gray-700 mb-1">
                  Rent Frequency <span className="text-red-500">*</span>
                </label>
                <Input
                  id="rentFrequency"
                  {...register('rentFrequency')}
                  placeholder="e.g., weekly, fortnightly, monthly"
                  className={errors.rentFrequency ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.rentFrequency && (
                  <p className="mt-1 text-sm text-red-600">{errors.rentFrequency.message}</p>
                )}
              </div>
            </div>

            {/* Document URL */}
            <div>
              <label htmlFor="documentUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Document URL
              </label>
              <Input
                id="documentUrl"
                type="url"
                {...register('documentUrl')}
                placeholder="https://..."
                className={errors.documentUrl ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-gray-500">Link to lease document (PDF or other)</p>
              {errors.documentUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.documentUrl.message}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                {...register('notes')}
                rows={3}
                placeholder="Additional notes about this lease..."
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
                {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update Lease' : 'Create Lease'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Owner Creation Modal */}
      <OwnerModal
        isOpen={showOwnerModal}
        onClose={() => setShowOwnerModal(false)}
        onSuccess={handleOwnerCreated}
        mode="create"
      />
    </>
  )
}

