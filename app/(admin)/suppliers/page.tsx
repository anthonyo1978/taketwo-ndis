"use client"

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Search, Wrench } from 'lucide-react'
import type { Supplier } from 'types/supplier'
import { SupplierModal } from 'components/suppliers/SupplierModal'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

  useEffect(() => {
    fetchSuppliers()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSuppliers(suppliers)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = suppliers.filter(
        (supplier) =>
          supplier.name.toLowerCase().includes(query) ||
          supplier.supplierType?.toLowerCase().includes(query) ||
          supplier.contactName?.toLowerCase().includes(query) ||
          supplier.phone?.toLowerCase().includes(query) ||
          supplier.email?.toLowerCase().includes(query)
      )
      setFilteredSuppliers(filtered)
    }
  }, [searchQuery, suppliers])

  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/suppliers')
      const result = await response.json() as { success: boolean; data?: Supplier[] }
      if (result.success) {
        setSuppliers(result.data || [])
        setFilteredSuppliers(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      toast.error('Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete supplier "${name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json() as { success: boolean; error?: string }

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete supplier')
      }

      toast.success('Supplier deleted successfully')
      fetchSuppliers()
    } catch (error) {
      console.error('Error deleting supplier:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete supplier')
    }
  }

  const truncateText = (text: string | undefined, maxLength: number = 50) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-3 text-gray-600">Loading suppliers...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Suppliers</h1>
              <p className="text-gray-600 mt-1">
                Manage maintenance and service providers
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Supplier
            </button>
          </div>

          {/* Search Bar */}
          {suppliers.length > 0 && (
            <div className="mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search suppliers by name, type, contact, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          )}

          {/* Suppliers Table */}
          {filteredSuppliers.length === 0 && searchQuery === '' ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Wrench className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Suppliers Yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Get started by adding your first supplier or service provider.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add First Supplier
              </button>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Results Found</h3>
              <p className="mt-2 text-sm text-gray-500">
                No suppliers match your search query. Try different keywords.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSuppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {supplier.supplierType ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {supplier.supplierType}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {supplier.contactName || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {supplier.phone || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {supplier.email || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {supplier.notes ? (
                            <span title={supplier.notes}>{truncateText(supplier.notes, 40)}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setEditingSupplier(supplier)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(supplier.id, supplier.name)}
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
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <SupplierModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchSuppliers()
          setShowCreateModal(false)
        }}
        mode="create"
      />

      {/* Edit Modal */}
      {editingSupplier && (
        <SupplierModal
          isOpen={!!editingSupplier}
          onClose={() => setEditingSupplier(null)}
          onSuccess={() => {
            fetchSuppliers()
            setEditingSupplier(null)
          }}
          supplier={editingSupplier}
          mode="edit"
        />
      )}
    </>
  )
}

