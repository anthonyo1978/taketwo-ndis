"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Owner } from 'types/owner'
import { OwnerModal } from 'components/owners/OwnerModal'

export default function OwnerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [owner, setOwner] = useState<Owner | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    if (id) {
      fetchOwner()
    }
  }, [id])

  const fetchOwner = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/owners/${id}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        setOwner(result.data)
      } else {
        setError(result.error || 'Owner not found')
      }
    } catch (err) {
      setError('Failed to load owner')
      console.error('Error fetching owner:', err)
    } finally {
      setLoading(false)
    }
  }

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

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-3 text-gray-600">Loading owner...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !owner) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-red-600 text-lg mb-4">
              {error || 'Owner not found'}
            </div>
            <Link
              href="/owners"
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Owners
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <Link href="/owners" className="hover:text-gray-700">
                Owners
              </Link>
              <span>/</span>
              <span className="text-gray-900">{owner.name}</span>
            </nav>

            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{owner.name}</h1>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${ownerTypeColors[owner.ownerType]}`}>
                    {ownerTypeLabels[owner.ownerType]}
                  </span>
                </div>
                {owner.primaryContactName && (
                  <p className="text-gray-600">Contact: {owner.primaryContactName}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Edit Owner
                </button>
                <Link
                  href="/owners"
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ← Back
                </Link>
              </div>
            </div>
          </div>

          {/* Owner Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {!owner.email && !owner.phone && (
                <div className="col-span-2 text-sm text-gray-500 italic">
                  No contact information available
                </div>
              )}
            </dl>

            {owner.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <dt className="text-sm font-medium text-gray-600 mb-2">Notes</dt>
                <dd className="text-sm text-gray-900 whitespace-pre-wrap">{owner.notes}</dd>
              </div>
            )}
          </div>

          {/* Audit Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Audit Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-600">Created</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(owner.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Last Updated</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(owner.updatedAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <OwnerModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={fetchOwner}
        owner={owner}
        mode="edit"
      />
    </>
  )
}

