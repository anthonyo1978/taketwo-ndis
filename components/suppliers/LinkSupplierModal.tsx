"use client"

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import type { Supplier } from 'types/supplier'

interface LinkSupplierModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  houseId: string
}

export function LinkSupplierModal({ isOpen, onClose, onSuccess, houseId }: LinkSupplierModalProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers()
      // Reset form
      setSelectedSupplierId('')
      setNotes('')
    }
  }, [isOpen])

  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/suppliers')
      const result = await response.json() as { success: boolean; data?: Supplier[] }
      if (result.success) {
        setSuppliers(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      toast.error('Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedSupplierId) {
      toast.error('Please select a supplier')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/houses/${houseId}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          notes: notes.trim() || undefined
        })
      })

      const result = await response.json() as { success: boolean; error?: string }

      if (!result.success) {
        throw new Error(result.error || 'Failed to link supplier')
      }

      toast.success('Supplier linked successfully')
      onSuccess()
    } catch (error) {
      console.error('Error linking supplier:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to link supplier')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Link Supplier to Property</h2>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Supplier Selection */}
          <div>
            <label htmlFor="supplierId" className="block text-sm font-medium text-gray-700 mb-1">
              Select Supplier <span className="text-red-500">*</span>
            </label>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="ml-3 text-gray-600 text-sm">Loading suppliers...</p>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
                <p className="text-yellow-800 font-medium">No suppliers available</p>
                <p className="text-yellow-700 mt-1">
                  You need to create suppliers first before linking them to properties.
                </p>
                <a
                  href="/suppliers"
                  className="mt-2 inline-block text-blue-600 hover:text-blue-700 underline"
                >
                  Go to Suppliers
                </a>
              </div>
            ) : (
              <select
                id="supplierId"
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={submitting}
                required
              >
                <option value="">Select a supplier...</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                    {supplier.supplierType && ` (${supplier.supplierType})`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add notes about this supplier's involvement with this property (e.g., Primary plumber, Emergency contact, Regular maintenance)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={submitting}
            />
            <p className="mt-1 text-sm text-gray-500">
              Optional: Describe this supplier's role or involvement with this property
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={submitting || suppliers.length === 0}
            >
              {submitting ? 'Linking...' : 'Link Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

