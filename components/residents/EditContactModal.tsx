"use client"

import { useState } from 'react'
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
  note?: string
  residentCount: number
}

interface EditContactModalProps {
  contact: Contact
  onClose: () => void
  onSuccess: () => void
}

export function EditContactModal({ contact, onClose, onSuccess }: EditContactModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: contact.name,
    role: contact.role || '',
    phone: contact.phone || '',
    email: contact.email || '',
    description: contact.description || '',
    note: contact.note || ''
  })

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Contact name is required')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json() as { success: boolean; error?: string }

      if (result.success) {
        toast.success('Contact updated successfully')
        onSuccess()
      } else {
        toast.error(result.error || 'Failed to update contact')
      }
    } catch (error) {
      console.error('Error updating contact:', error)
      toast.error('Failed to update contact')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isShared = contact.residentCount > 1

  return (
    <Dialog open={true} onClose={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>

        {/* Shared Contact Warning */}
        {isShared && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex">
              <svg className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Shared Contact</p>
                <p>This contact is linked to <strong>{contact.residentCount} resident{contact.residentCount !== 1 ? 's' : ''}</strong>. Changes will affect all of them.</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
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
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

