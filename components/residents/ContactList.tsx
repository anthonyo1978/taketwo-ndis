"use client"

import { useState, useEffect } from 'react'
import { Button } from 'components/Button/Button'
import { AddContactModal } from './AddContactModal'
import { EditContactModal } from './EditContactModal'
import toast from 'react-hot-toast'

interface Contact {
  id: string
  linkId: string
  name: string
  role?: string
  phone?: string
  email?: string
  description?: string
  note?: string
  residentCount: number
  created_at: string
  updated_at: string
}

interface ContactListProps {
  residentId: string
}

export function ContactList({ residentId }: ContactListProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)

  const fetchContacts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/residents/${residentId}/contacts`)
      const result = await response.json() as { success: boolean; data?: Contact[]; error?: string }

      if (result.success) {
        setContacts(result.data || [])
      } else {
        toast.error('Failed to load contacts')
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
      toast.error('Failed to load contacts')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [residentId])

  const handleDelete = async (contact: Contact) => {
    const message = contact.residentCount === 1
      ? `This will permanently delete "${contact.name}" from the system. Continue?`
      : `Remove "${contact.name}" from this resident's contact list?`

    if (!confirm(message)) return

    try {
      const response = await fetch(`/api/residents/${residentId}/contacts?linkId=${contact.linkId}`, {
        method: 'DELETE'
      })

      const result = await response.json() as { success: boolean; deletedContact?: boolean }

      if (result.success) {
        toast.success(result.deletedContact ? 'Contact deleted' : 'Contact removed from list')
        fetchContacts()
      } else {
        toast.error('Failed to remove contact')
      }
    } catch (error) {
      console.error('Error deleting contact:', error)
      toast.error('Failed to remove contact')
    }
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading contacts...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Contact List</h3>
          <p className="text-sm text-gray-600">Manage important contacts for this resident</p>
        </div>
        <Button
          intent="primary"
          onClick={() => setShowAddModal(true)}
        >
          + Add Contact
        </Button>
      </div>

      {/* Contacts Table */}
      {contacts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No contacts yet</h3>
          <p className="mt-2 text-sm text-gray-600">Add contacts like family members, doctors, or support coordinators</p>
          <Button
            intent="primary"
            onClick={() => setShowAddModal(true)}
            className="mt-4"
          >
            + Add First Contact
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Note
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contacts.map((contact) => (
                <tr key={contact.linkId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{contact.name}</span>
                      {contact.residentCount > 1 && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Shared ({contact.residentCount})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{contact.role || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{contact.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{contact.email || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{contact.description || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{contact.note || '-'}</td>
                  <td className="px-6 py-4 text-right text-sm space-x-3">
                    <button
                      onClick={() => setEditingContact(contact)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(contact)}
                      className="text-red-600 hover:text-red-900 font-medium"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <AddContactModal
          residentId={residentId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            fetchContacts()
          }}
        />
      )}

      {/* Edit Contact Modal */}
      {editingContact && (
        <EditContactModal
          contact={editingContact}
          onClose={() => setEditingContact(null)}
          onSuccess={() => {
            setEditingContact(null)
            fetchContacts()
          }}
        />
      )}
    </div>
  )
}

