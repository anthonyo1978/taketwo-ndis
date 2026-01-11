"use client"

import { useState } from "react"
import { X } from "lucide-react"
import type { UtilityType } from "types/utility-snapshot"

interface AddUtilitySnapshotModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  propertyId: string
  utilityType: UtilityType
}

export function AddUtilitySnapshotModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  propertyId, 
  utilityType 
}: AddUtilitySnapshotModalProps) {
  const [onCharge, setOnCharge] = useState(false)
  const [meterReading, setMeterReading] = useState("")
  const [readingUnit, setReadingUnit] = useState("")
  const [readingAt, setReadingAt] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const data: any = {
        utilityType,
        onCharge,
      }

      if (meterReading) data.meterReading = parseFloat(meterReading)
      if (readingUnit) data.readingUnit = readingUnit
      if (readingAt) data.readingAt = new Date(readingAt).toISOString()
      if (notes) data.notes = notes

      const response = await fetch(`/api/houses/${propertyId}/utility-snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json() as { success: boolean; error?: string }

      if (result.success) {
        onSuccess()
        handleClose()
      } else {
        setError(result.error || 'Failed to create snapshot')
      }
    } catch (err) {
      console.error('Error creating snapshot:', err)
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setOnCharge(false)
    setMeterReading("")
    setReadingUnit("")
    setReadingAt("")
    setNotes("")
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            Add {utilityType.charAt(0).toUpperCase() + utilityType.slice(1)} Snapshot
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            type="button"
            disabled={saving}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* On-Charge Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              On-Charge Status <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={onCharge === true}
                  onChange={() => setOnCharge(true)}
                  className="mr-2"
                  disabled={saving}
                />
                <span className="text-sm">Yes (On-charged)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={onCharge === false}
                  onChange={() => setOnCharge(false)}
                  className="mr-2"
                  disabled={saving}
                />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>

          {/* Meter Reading */}
          <div>
            <label htmlFor="meterReading" className="block text-sm font-medium text-gray-700 mb-1">
              Meter Reading <span className="text-gray-500">(Optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                id="meterReading"
                type="number"
                step="0.01"
                value={meterReading}
                onChange={(e) => setMeterReading(e.target.value)}
                placeholder="e.g., 12345.67"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={saving}
              />
              <input
                type="text"
                value={readingUnit}
                onChange={(e) => setReadingUnit(e.target.value)}
                placeholder="Unit (e.g., kWh)"
                maxLength={20}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={saving}
              />
            </div>
          </div>

          {/* Reading Date/Time */}
          <div>
            <label htmlFor="readingAt" className="block text-sm font-medium text-gray-700 mb-1">
              Reading Date/Time <span className="text-gray-500">(Optional)</span>
            </label>
            <input
              id="readingAt"
              type="datetime-local"
              value={readingAt}
              onChange={(e) => setReadingAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={saving}
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave blank to use current date/time
            </p>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-500">(Optional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Any additional notes or context..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={saving}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Add Snapshot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

