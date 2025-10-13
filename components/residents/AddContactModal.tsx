"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from 'components/ui/Dialog'
import { Input } from 'components/ui/Input'
import { Button } from 'components/Button/Button'
import toast from 'react-hot-toast'

interface Contact {
  id: string
  name: string
  role?: string
  phone?: string
  email?: string
  description?: string
  residentCount: number
}

interface AddContactModalProps {
  residentId: string
  onClose: () => void
  onSuccess: () => void
}

export function AddContactModal({ residentId, onClose, onSuccess }: AddContactModalProps) {
  const [mode, setMode] = useState<'search' | 'create'>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Contact[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state for creating new contact
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    phone: '',
    email: '',
    description: '',
    note: ''
  })

  // Search for existing contacts
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    const searchTimer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await fetch(`/api/contacts/search?q=${encodeURIComponent(searchQuery)}`)
        const result = await response.json() as { success: boolean; data?: Contact[] }

        if (result.success) {
          setSearchResults(result.data || [])
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(searchTimer)
  }, [searchQuery])

  const handleLinkExisting = async (contactId: string) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/residents/${residentId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId })
      })

      const result = await response.json() as { success: boolean; error?: string }

      if (result.success) {
        toast.success('Contact linked successfully')
        onSuccess()
      } else {
        toast.error(result.error || 'Failed to link contact')
      }
    } catch (error) {
      console.error('Error linking contact:', error)
      toast.error('Failed to link contact')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateNew = async () => {
    if (!formData.name.trim()) {
      toast.error('Contact name is required')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/residents/${residentId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json() as { success: boolean; error?: string }

      if (result.success) {
        toast.success('Contact created successfully')
        onSuccess()
      } else {
        toast.error(result.error || 'Failed to create contact')
      }
    } catch (error) {
      console.error('Error creating contact:', error)
      toast.error('Failed to create contact')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onClose={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('search')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              mode === 'search'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Link Existing Contact
          </button>
          <button
            onClick={() => setMode('create')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              mode === 'create'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Create New Contact
          </button>
        </div>

        {/* Search Mode */}
        {mode === 'search' && (
          <div className="space-y-4">
            <Input
              id="search"
              type="text"
              label="Search for existing contact"
              placeholder="Type name, email, or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* Search Results */}
            {isSearching && (
              <div className="text-center py-4">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {searchResults.map((contact) => (
                  <div key={contact.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                        {contact.residentCount > 0 && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Used by {contact.residentCount} resident{contact.residentCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {contact.role && `${contact.role} • `}
                        {contact.phone && `${contact.phone} • `}
                        {contact.email || ''}
                      </p>
                      {contact.description && (
                        <p className="text-xs text-gray-500 mt-1">{contact.description}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleLinkExisting(contact.id)}
                      disabled={isSubmitting}
                    >
                      Link
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                No existing contacts found. Try creating a new one instead.
              </div>
            )}
          </div>
        )}

        {/* Create Mode */}
        {mode === 'create' && (
          <div className="space-y-4">
            <Input
              id="name"
              label="Contact Name *"
              placeholder="Dr. Sarah Lee"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <Input
              id="role"
              label="Role"
              placeholder="Doctor, Family, Support Coordinator, etc."
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="phone"
                label="Phone"
                placeholder="0402 123 456"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />

              <Input
                id="email"
                type="email"
                label="Email"
                placeholder="contact@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <Input
              id="description"
              label="Description"
              placeholder="Local GP, Brother, etc."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <div>
              <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                Note
              </label>
              <textarea
                id="note"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes..."
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              />
            </div>

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
                onClick={handleCreateNew}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Creating...' : 'Create Contact'}
              </Button>
            </div>
          </div>
        )}

        {/* Cancel button for search mode */}
        {mode === 'search' && (
          <div className="flex justify-end pt-4">
            <Button intent="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

