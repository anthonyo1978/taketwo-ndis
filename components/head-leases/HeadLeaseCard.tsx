"use client"

import { useState } from 'react'
import type { HeadLease } from 'types/head-lease'
import { HeadLeaseModal } from './HeadLeaseModal'

interface HeadLeaseCardProps {
  lease: HeadLease
  onUpdate: () => void
}

export function HeadLeaseCard({ lease, onUpdate }: HeadLeaseCardProps) {
  const [showEditModal, setShowEditModal] = useState(false)

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    upcoming: 'bg-blue-100 text-blue-800',
    expired: 'bg-gray-100 text-gray-800'
  }

  const statusLabels = {
    active: 'Active',
    upcoming: 'Upcoming',
    expired: 'Expired'
  }

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return 'N/A'
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Head Lease</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[lease.status]}`}>
                {statusLabels[lease.status]}
              </span>
            </div>
            {lease.reference && (
              <p className="text-sm text-gray-600">Ref: {lease.reference}</p>
            )}
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="text-gray-400 hover:text-gray-600"
            title="Edit lease"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>

        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-600">Lease Period</dt>
            <dd className="text-sm text-gray-900">
              {formatDate(lease.startDate)} → {lease.endDate ? formatDate(lease.endDate) : 'Open-ended'}
            </dd>
          </div>

          {(lease.rentAmount !== undefined && lease.rentAmount !== null) && (
            <div>
              <dt className="text-sm font-medium text-gray-600">Rent</dt>
              <dd className="text-sm text-gray-900">
                {formatCurrency(lease.rentAmount)} / {lease.rentFrequency}
              </dd>
            </div>
          )}

          {lease.reviewDate && (
            <div>
              <dt className="text-sm font-medium text-gray-600">Next Review</dt>
              <dd className="text-sm text-gray-900">{formatDate(lease.reviewDate)}</dd>
            </div>
          )}

          {lease.owner && (
            <div>
              <dt className="text-sm font-medium text-gray-600">Owner</dt>
              <dd className="text-sm text-gray-900">{lease.owner.name}</dd>
            </div>
          )}
        </dl>

        {lease.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <dt className="text-sm font-medium text-gray-600 mb-1">Notes</dt>
            <dd className="text-sm text-gray-900 whitespace-pre-wrap">{lease.notes}</dd>
          </div>
        )}

        {lease.documentUrl && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <a
              href={lease.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              View Lease Document
            </a>
          </div>
        )}
      </div>

      <HeadLeaseModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={onUpdate}
        lease={lease}
        houseId={lease.houseId}
        mode="edit"
      />
    </>
  )
}

