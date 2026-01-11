"use client"

import { useState, useEffect } from "react"
import { Trash2, Plus } from "lucide-react"
import type { UtilitySnapshot, UtilityType } from "types/utility-snapshot"

interface UtilitySnapshotsListProps {
  propertyId: string
  utilityType: UtilityType
  onAddSnapshot: () => void
  refreshTrigger?: number
}

export function UtilitySnapshotsList({ propertyId, utilityType, onAddSnapshot, refreshTrigger }: UtilitySnapshotsListProps) {
  const [snapshots, setSnapshots] = useState<UtilitySnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSnapshots = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/houses/${propertyId}/utility-snapshots?utilityType=${utilityType}`)
      const result = await response.json() as { success: boolean; data?: UtilitySnapshot[]; error?: string }
      
      if (result.success && result.data) {
        setSnapshots(result.data)
      } else {
        setError(result.error || 'Failed to load snapshots')
      }
    } catch (err) {
      console.error('Error fetching utility snapshots:', err)
      setError('Network error loading snapshots')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSnapshots()
  }, [propertyId, utilityType, refreshTrigger])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this snapshot?')) return
    
    try {
      const response = await fetch(`/api/utility-snapshots/${id}`, {
        method: 'DELETE'
      })
      const result = await response.json() as { success: boolean }
      
      if (result.success) {
        fetchSnapshots() // Refresh list
      } else {
        alert('Failed to delete snapshot')
      }
    } catch (err) {
      console.error('Error deleting snapshot:', err)
      alert('Failed to delete snapshot')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading {utilityType} snapshots...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchSnapshots}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (snapshots.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-600 mb-4">No {utilityType} snapshots recorded yet</p>
        <button
          onClick={onAddSnapshot}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="size-4" />
          Add First Snapshot
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}</p>
        <button
          onClick={onAddSnapshot}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="size-4" />
          Add Snapshot
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                On-Charge
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Meter Reading
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {snapshots.map((snapshot) => (
              <tr key={snapshot.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {(snapshot.readingAt || snapshot.createdAt).toLocaleDateString()}
                  <span className="block text-xs text-gray-500">
                    {(snapshot.readingAt || snapshot.createdAt).toLocaleTimeString()}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {snapshot.onCharge ? (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Yes
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                      No
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {snapshot.meterReading ? (
                    <>
                      {snapshot.meterReading.toLocaleString()}
                      {snapshot.readingUnit && <span className="text-gray-500 ml-1">{snapshot.readingUnit}</span>}
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {snapshot.notes ? (
                    <span className="line-clamp-2">{snapshot.notes}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => handleDelete(snapshot.id)}
                    className="text-red-600 hover:text-red-900 transition-colors"
                    title="Delete snapshot"
                  >
                    <Trash2 className="size-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

