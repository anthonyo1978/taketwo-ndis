"use client"

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Wrench, ChevronDown, ChevronUp } from 'lucide-react'
import type { HouseSupplierWithDetails } from 'types/house-supplier'

interface HouseSuppliersListProps {
  houseId: string
  refreshTrigger: number
  onUpdate: () => void
}

export function HouseSuppliersList({ houseId, refreshTrigger, onUpdate }: HouseSuppliersListProps) {
  const [suppliers, setSuppliers] = useState<HouseSupplierWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
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

      toast.success('Notes updated')
      setEditingNotes(null)
      onUpdate()
    } catch (error) {
      console.error('Error updating notes:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update notes')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        <p className="ml-2 text-sm text-gray-400">Loading suppliers…</p>
      </div>
    )
  }

  if (suppliers.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <Wrench className="mx-auto h-10 w-10 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Suppliers Linked</h3>
        <p className="mt-1 text-sm text-gray-500">
          Click "Link Supplier" above to add maintenance and service providers.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {suppliers.map((link) => {
            const isExpanded = expandedId === link.id
            return (
              <tr key={link.id} className="group">
                <td className="px-4 py-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : link.id)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="size-3.5 text-gray-400" /> : <ChevronDown className="size-3.5 text-gray-400" />}
                    {link.supplier.name}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                  {link.supplier.supplierType ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {link.supplier.supplierType}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {link.supplier.contactName || <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  {link.supplier.phone ? (
                    <a href={`tel:${link.supplier.phone}`} className="text-gray-600 hover:text-blue-600">
                      {link.supplier.phone}
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => handleUnlink(link.id, link.supplier.name)}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Unlink
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Expanded detail panel — rendered below the table */}
      {expandedId && (() => {
        const link = suppliers.find(s => s.id === expandedId)
        if (!link) return null
        return (
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {/* Contact details */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Contact Details</h4>
                <div className="space-y-1">
                  {link.supplier.contactName && <p className="text-gray-700">{link.supplier.contactName}</p>}
                  {link.supplier.phone && (
                    <p><a href={`tel:${link.supplier.phone}`} className="text-blue-600 hover:underline">{link.supplier.phone}</a></p>
                  )}
                  {link.supplier.email && (
                    <p><a href={`mailto:${link.supplier.email}`} className="text-blue-600 hover:underline">{link.supplier.email}</a></p>
                  )}
                  {!link.supplier.contactName && !link.supplier.phone && !link.supplier.email && (
                    <p className="text-gray-400 italic">No contact info</p>
                  )}
                </div>
              </div>

              {/* Supplier notes */}
              {link.supplier.notes && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Supplier Notes</h4>
                  <p className="text-gray-600">{link.supplier.notes}</p>
                </div>
              )}

              {/* Property-specific notes */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Property Notes</h4>
                {editingNotes === link.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      rows={2}
                      placeholder="Notes about this supplier for this property…"
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
                        onClick={() => { setEditingNotes(null); setNotesValue('') }}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <p className="text-gray-600">
                      {link.notes || <span className="italic text-gray-400">No notes</span>}
                    </p>
                    <button
                      onClick={() => { setEditingNotes(link.id); setNotesValue(link.notes || '') }}
                      className="text-xs text-blue-600 hover:text-blue-700 ml-2 whitespace-nowrap"
                    >
                      {link.notes ? 'Edit' : 'Add'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
