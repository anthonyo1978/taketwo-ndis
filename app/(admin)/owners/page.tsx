"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import type { Owner } from 'types/owner'
import { OwnerModal } from 'components/owners/OwnerModal'

export default function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null)

  useEffect(() => {
    fetchOwners()
  }, [])

  const fetchOwners = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/owners')
      const result = await response.json() as { success: boolean; data?: Owner[] }
      if (result.success) {
        setOwners(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching owners:', error)
      toast.error('Failed to load owners')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete owner "${name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/owners/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json() as { success: boolean; error?: string }

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete owner')
      }

      toast.success('Owner deleted successfully')
      fetchOwners()
    } catch (error) {
      console.error('Error deleting owner:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete owner')
    }
  }

  const ownerTypeLabels = {
    individual: 'Individual',
    company: 'Company',
    trust: 'Trust',
    other: 'Other'
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-3 text-gray-600">Loading owners...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Property Owners</h1>
              <p className="text-gray-600 mt-1">
                Manage property owners and landlords
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Owner
            </button>
          </div>

          {/* Owners Table */}
          {owners.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Owners Yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Get started by creating your first property owner.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add First Owner
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {owners.map((owner) => (
                    <tr key={owner.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{owner.name}</div>
                        {owner.primaryContactName && (
                          <div className="text-sm text-gray-500">{owner.primaryContactName}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          {ownerTypeLabels[owner.ownerType]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {owner.email && <div>{owner.email}</div>}
                        {owner.phone && <div>{owner.phone}</div>}
                        {!owner.email && !owner.phone && <span className="text-gray-400">No contact info</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setEditingOwner(owner)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(owner.id, owner.name)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <OwnerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchOwners()
          setShowCreateModal(false)
        }}
        mode="create"
      />

      {/* Edit Modal */}
      {editingOwner && (
        <OwnerModal
          isOpen={!!editingOwner}
          onClose={() => setEditingOwner(null)}
          onSuccess={() => {
            fetchOwners()
            setEditingOwner(null)
          }}
          owner={editingOwner}
          mode="edit"
        />
      )}
    </>
  )
}

