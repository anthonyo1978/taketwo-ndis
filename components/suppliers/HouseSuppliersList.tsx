"use client"

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Wrench, Mail, Phone, User, FileText } from 'lucide-react'
import type { HouseSupplierWithDetails } from 'types/house-supplier'

interface HouseSuppliersListProps {
  houseId: string
  refreshTrigger: number
  onUpdate: () => void
}

export function HouseSuppliersList({ houseId, refreshTrigger, onUpdate }: HouseSuppliersListProps) {
  const [suppliers, setSuppliers] = useState<HouseSupplierWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState('')

  useEffect(() => {
    fetchSuppliers()
  }, [houseId, refreshTrigger])

  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/houses/${houseId}/suppliers`)
      const result = await response.json() as { success: boolean; data?: HouseSupplierWithDetails[] }
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

  const handleUnlink = async (linkId: string, supplierName: string) => {
    if (!confirm(`Are you sure you want to unlink supplier "${supplierName}" from this property?`)) {
      return
    }

    try {
      const response = await fetch(`/api/house-suppliers/${linkId}`, {
        method: 'DELETE'
      })

      const result = await response.json() as { success: boolean; error?: string }

      if (!result.success) {
        throw new Error(result.error || 'Failed to unlink supplier')
      }

      toast.success('Supplier unlinked successfully')
      onUpdate()
    } catch (error) {
      console.error('Error unlinking supplier:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to unlink supplier')
    }
  }

  const handleStartEditNotes = (linkId: string, currentNotes?: string) => {
    setEditingNotes(linkId)
    setNotesValue(currentNotes || '')
  }

  const handleSaveNotes = async (linkId: string) => {
    try {
      const response = await fetch(`/api/house-suppliers/${linkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesValue.trim() || undefined })
      })

      const result = await response.json() as { success: boolean; error?: string }

      if (!result.success) {
        throw new Error(result.error || 'Failed to update notes')
      }

      toast.success('Notes updated successfully')
      setEditingNotes(null)
      onUpdate()
    } catch (error) {
      console.error('Error updating notes:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update notes')
    }
  }

  const handleCancelEdit = () => {
    setEditingNotes(null)
    setNotesValue('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading suppliers...</p>
      </div>
    )
  }

  if (suppliers.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <Wrench className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No Suppliers Linked</h3>
        <p className="mt-2 text-sm text-gray-500">
          This property doesn't have any suppliers linked yet. Click "Link Supplier" above to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {suppliers.map((link) => (
        <div key={link.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wrench className="size-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{link.supplier.name}</h3>
                {link.supplier.supplierType && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {link.supplier.supplierType}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-2 mb-4">
            {link.supplier.contactName && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="size-4 text-gray-400" />
                <span>{link.supplier.contactName}</span>
              </div>
            )}
            {link.supplier.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="size-4 text-gray-400" />
                <a href={`tel:${link.supplier.phone}`} className="hover:text-blue-600">
                  {link.supplier.phone}
                </a>
              </div>
            )}
            {link.supplier.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="size-4 text-gray-400" />
                <a href={`mailto:${link.supplier.email}`} className="hover:text-blue-600">
                  {link.supplier.email}
                </a>
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText className="size-4" />
                <span>Property Notes</span>
              </div>
              {editingNotes !== link.id && (
                <button
                  onClick={() => handleStartEditNotes(link.id, link.notes)}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  {link.notes ? 'Edit' : 'Add Note'}
                </button>
              )}
            </div>
            
            {editingNotes === link.id ? (
              <div className="space-y-2">
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  rows={3}
                  placeholder="Add notes about this supplier's involvement..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveNotes(link.id)}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                {link.notes || <span className="italic text-gray-400">No notes added</span>}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <button
              onClick={() => handleUnlink(link.id, link.supplier.name)}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Unlink Supplier
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

