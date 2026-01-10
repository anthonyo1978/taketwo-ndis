"use client"

import { useState } from 'react'
import type { Owner } from 'types/owner'
import { OwnerModal } from './OwnerModal'

interface OwnerSummaryCardProps {
  owner: Owner
  onUpdate: () => void
}

export function OwnerSummaryCard({ owner, onUpdate }: OwnerSummaryCardProps) {
  const [showEditModal, setShowEditModal] = useState(false)

  const ownerTypeLabels = {
    individual: 'Individual',
    company: 'Company',
    trust: 'Trust',
    other: 'Other'
  }

  const ownerTypeColors = {
    individual: 'bg-purple-100 text-purple-800',
    company: 'bg-blue-100 text-blue-800',
    trust: 'bg-green-100 text-green-800',
    other: 'bg-gray-100 text-gray-800'
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{owner.name}</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${ownerTypeColors[owner.ownerType]}`}>
              {ownerTypeLabels[owner.ownerType]}
            </span>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="text-gray-400 hover:text-gray-600"
            title="Edit owner"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>

        <dl className="space-y-3">
          {owner.primaryContactName && (
            <div>
              <dt className="text-sm font-medium text-gray-600">Primary Contact</dt>
              <dd className="text-sm text-gray-900">{owner.primaryContactName}</dd>
            </div>
          )}

          {owner.email && (
            <div>
              <dt className="text-sm font-medium text-gray-600">Email</dt>
              <dd className="text-sm text-gray-900">
                <a href={`mailto:${owner.email}`} className="text-blue-600 hover:text-blue-700">
                  {owner.email}
                </a>
              </dd>
            </div>
          )}

          {owner.phone && (
            <div>
              <dt className="text-sm font-medium text-gray-600">Phone</dt>
              <dd className="text-sm text-gray-900">
                <a href={`tel:${owner.phone}`} className="text-blue-600 hover:text-blue-700">
                  {owner.phone}
                </a>
              </dd>
            </div>
          )}

          {owner.notes && (
            <div>
              <dt className="text-sm font-medium text-gray-600">Notes</dt>
              <dd className="text-sm text-gray-900 whitespace-pre-wrap">{owner.notes}</dd>
            </div>
          )}

          {!owner.primaryContactName && !owner.email && !owner.phone && !owner.notes && (
            <div className="text-sm text-gray-500 italic">
              No additional contact information
            </div>
          )}
        </dl>
      </div>

      <OwnerModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={onUpdate}
        owner={owner}
        mode="edit"
      />
    </>
  )
}

