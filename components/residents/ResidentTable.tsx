"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { Resident } from "types/resident"
import { getResidentBillingStatus, getBillingStatusRingClass } from "lib/utils/billing-status"

interface ApiResponse {
  success: boolean
  data?: Resident[]
  error?: string
}

interface ResidentTableProps {
  houseId: string
  refreshTrigger?: number // Used to trigger re-fetch when new resident added
  onResidentsLoaded?: (residents: Resident[]) => void // Callback to pass residents to parent
  onResidentRemoved?: () => void // Callback for when a resident is removed
}

export function ResidentTable({ houseId, refreshTrigger, onResidentsLoaded, onResidentRemoved }: ResidentTableProps) {
  const router = useRouter()
  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingRoom, setEditingRoom] = useState<{ residentId: string; residentName: string; currentRoom?: string } | null>(null)
  const [roomValue, setRoomValue] = useState("")
  const [savingRoom, setSavingRoom] = useState(false)

  const fetchResidents = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/houses/${houseId}/residents`)
      const result = await response.json() as ApiResponse
      
      if (result.success && result.data) {
        setResidents(result.data)
        setError(null)
        // Notify parent component of loaded residents
        onResidentsLoaded?.(result.data)
      } else {
        setError(result.error || 'Failed to load residents')
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
      console.error('Error fetching residents:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResidents()
  }, [houseId, refreshTrigger])

  const retryFetch = () => {
    setError(null)
    fetchResidents()
  }

  const handleRemoveResident = async (residentId: string, residentName: string) => {
    if (!confirm(`Are you sure you want to remove ${residentName} from this house?`)) {
      return
    }

    try {
      const response = await fetch(`/api/houses/${houseId}/residents/unassign`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ residentId })
      })

      const result = await response.json() as { success: boolean; message?: string; error?: string }

      if (result.success) {
        // Refresh the resident table
        fetchResidents()
        // Notify parent component
        onResidentRemoved?.()
        console.log(result.message)
      } else {
        console.error('Failed to remove resident:', result.error)
        alert(`Failed to remove resident: ${result.error}`)
      }
    } catch (error) {
      console.error('Error removing resident:', error)
      alert('Error removing resident. Please try again.')
    }
  }

  const handleEditRoom = (residentId: string, residentName: string, currentRoom?: string) => {
    setEditingRoom({ residentId, residentName, currentRoom })
    setRoomValue(currentRoom || "")
  }

  const handleSaveRoom = async () => {
    if (!editingRoom) return

    setSavingRoom(true)
    try {
      const response = await fetch(`/api/residents/${editingRoom.residentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roomLabel: roomValue.trim() || null })
      })

      const result = await response.json() as { success: boolean; error?: string }

      if (result.success) {
        // Refresh the resident table
        fetchResidents()
        // Close the modal
        setEditingRoom(null)
        setRoomValue("")
      } else {
        console.error('Failed to update room:', result.error)
        alert(`Failed to update room: ${result.error}`)
      }
    } catch (error) {
      console.error('Error updating room:', error)
      alert('Error updating room. Please try again.')
    } finally {
      setSavingRoom(false)
    }
  }

  const handleCancelEditRoom = () => {
    setEditingRoom(null)
    setRoomValue("")
  }

  // Loading state with skeleton table
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Residents</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Photo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Age
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gender
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NDIS ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[1, 2, 3].map(i => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Error state with retry
  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="text-red-600 text-lg mb-4">{error}</div>
        <button 
          onClick={retryFetch}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Empty state
  if (residents.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No residents found</h3>
        <p className="text-gray-600">This house doesn't have any residents yet.</p>
      </div>
    )
  }

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: Date): number => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  // Success state - residents table
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Residents ({residents.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Photo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Age
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gender
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Room
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                NDIS ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {residents.map((resident) => {
              const billingStatus = getResidentBillingStatus(resident)
              const ringClass = getBillingStatusRingClass(billingStatus.status)
              
              return (
              <tr key={resident.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div 
                    className="flex-shrink-0 h-10 w-10 relative group cursor-pointer"
                    onClick={() => router.push(`/residents/${resident.id}`)}
                  >
                    {resident.photoBase64 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className={`h-10 w-10 rounded-full object-cover ${ringClass} hover:scale-110 transition-transform`}
                        src={resident.photoBase64}
                        alt={`${resident.firstName} ${resident.lastName}`}
                      />
                    ) : (
                      <div className={`h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center ${ringClass} hover:scale-110 transition-transform`}>
                        <span className="text-gray-600 text-sm font-medium">
                          {resident.firstName.charAt(0)}{resident.lastName.charAt(0)}
                        </span>
                      </div>
                    )}
                    {/* Tooltip showing billing status - always visible on hover */}
                    <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      <span className={billingStatus.status === 'ready' ? 'text-green-400' : 'text-orange-400'}>
                        {billingStatus.status === 'ready' ? 'Currently billing' : 'Not billing'}
                      </span>
                      {billingStatus.status === 'not-ready' && billingStatus.reasons.length > 0 && (
                        <span className="text-gray-300"> • {billingStatus.reasons.join(', ')}</span>
                      )}
                      <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {resident.firstName} {resident.lastName}
                  </div>
                  <div className="text-sm text-gray-500">
                    ID: {resident.id}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {calculateAge(resident.dateOfBirth)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {resident.gender}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {resident.roomLabel || <span className="text-gray-400">—</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {resident.phone || '-'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {resident.email || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {resident.ndisId || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(resident.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                  <button
                    onClick={() => handleEditRoom(resident.id, `${resident.firstName} ${resident.lastName}`, resident.roomLabel)}
                    className="text-blue-600 hover:text-blue-900 transition-colors"
                    title="Edit room assignment"
                  >
                    Edit Room
                  </button>
                  <button
                    onClick={() => handleRemoveResident(resident.id, `${resident.firstName} ${resident.lastName}`)}
                    className="text-red-600 hover:text-red-900 transition-colors"
                    title="Remove from house"
                  >
                    Remove
                  </button>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Room Modal */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Edit Room Assignment</h2>
              <button
                onClick={handleCancelEditRoom}
                className="text-gray-400 hover:text-gray-600"
                type="button"
              >
                <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Update room assignment for <span className="font-semibold text-gray-900">{editingRoom.residentName}</span>
              </p>

              <div>
                <label htmlFor="editRoomLabel" className="block text-sm font-medium text-gray-700 mb-2">
                  Room / Unit
                </label>
                <input
                  id="editRoomLabel"
                  type="text"
                  placeholder="e.g., Room 1, Bedroom A, Studio 2"
                  value={roomValue}
                  onChange={(e) => setRoomValue(e.target.value)}
                  maxLength={50}
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !savingRoom) {
                      handleSaveRoom()
                    }
                  }}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Leave blank to remove room assignment
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={handleCancelEditRoom}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={savingRoom}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoom}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={savingRoom}
              >
                {savingRoom ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}