"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from 'components/ui/Dialog'
import { Input } from 'components/ui/Input'
import { Button } from 'components/Button/Button'
import toast from 'react-hot-toast'

interface CreateClaimModalProps {
  onClose: () => void
  onSuccess: (claimNumber: string) => void
}

interface EligibleTransactionsPreview {
  transactions: any[]
  count: number
  totalAmount: number
}

export function CreateClaimModal({ onClose, onSuccess }: CreateClaimModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [preview, setPreview] = useState<EligibleTransactionsPreview | null>(null)
  
  const [filters, setFilters] = useState({
    residentId: '',
    dateFrom: '',
    dateTo: '',
    includeAll: false
  })

  // Fetch preview of eligible transactions
  const fetchPreview = async () => {
    setIsLoadingPreview(true)
    try {
      const params = new URLSearchParams()
      if (filters.residentId) params.append('residentId', filters.residentId)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)

      const response = await fetch(`/api/claims/eligible-transactions?${params.toString()}`)
      const result = await response.json() as { success: boolean; data?: EligibleTransactionsPreview; error?: string }

      if (result.success && result.data) {
        setPreview(result.data)
      } else {
        setPreview(null)
      }
    } catch (error) {
      console.error('Error fetching preview:', error)
      setPreview(null)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  // Fetch preview when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPreview()
    }, 500)

    return () => clearTimeout(timer)
  }, [filters.residentId, filters.dateFrom, filters.dateTo])

  const handleCreateClaim = async () => {
    if (!preview || preview.count === 0) {
      toast.error('No eligible transactions found')
      return
    }

    if (!confirm(`Create claim with ${preview.count} transaction${preview.count !== 1 ? 's' : ''} totaling $${preview.totalAmount.toFixed(2)}?`)) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      })

      const result = await response.json() as { 
        success: boolean
        data?: { claim: any }
        message?: string
        error?: string 
      }

      if (result.success && result.data) {
        toast.success(result.message || 'Claim created successfully')
        onSuccess(result.data.claim.claim_number)
      } else {
        toast.error(result.error || 'Failed to create claim')
      }
    } catch (error) {
      console.error('Error creating claim:', error)
      toast.error('Failed to create claim')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onClose={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Claim</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select filters to group eligible transactions (status = draft) into a claim.
          </p>

          {/* Filters */}
          <div className="space-y-4">
            <Input
              id="residentId"
              label="Resident ID (Optional)"
              placeholder="Enter resident ID to filter..."
              value={filters.residentId}
              onChange={(e) => setFilters({ ...filters, residentId: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="dateFrom"
                type="date"
                label="Date From (Optional)"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />

              <Input
                id="dateTo"
                type="date"
                label="Date To (Optional)"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="includeAll"
                type="checkbox"
                checked={filters.includeAll}
                onChange={(e) => setFilters({ ...filters, includeAll: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="includeAll" className="text-sm text-gray-700">
                Include all eligible transactions (ignore other filters)
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">Preview</p>
            {isLoadingPreview ? (
              <p className="text-sm text-blue-700">Loading...</p>
            ) : preview ? (
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>{preview.count}</strong> eligible transaction{preview.count !== 1 ? 's' : ''} found</p>
                <p>Total amount: <strong>${preview.totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
              </div>
            ) : (
              <p className="text-sm text-blue-700">No eligible transactions found</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              intent="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              intent="primary"
              onClick={handleCreateClaim}
              disabled={isSubmitting || !preview || preview.count === 0}
              className="flex-1"
            >
              {isSubmitting ? 'Creating Claim...' : 'Create Claim'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

