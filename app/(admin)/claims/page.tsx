"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from 'components/Button/Button'
import { LoadingSpinner } from 'components/ui/LoadingSpinner'
import { CreateClaimModal } from 'components/claims/CreateClaimModal'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface Claim {
  id: string
  claimNumber: string
  createdBy: string
  createdAt: string
  transactionCount: number
  totalAmount: number
  status: string
  filtersJson?: {
    residentId?: string
    dateFrom?: string
    dateTo?: string
    includeAll?: boolean
  }
}

export default function ClaimsPage() {
  const router = useRouter()
  const [claims, setClaims] = useState<Claim[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchClaims = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/claims')
      const result = await response.json() as { success: boolean; data?: Claim[]; error?: string }

      if (result.success) {
        setClaims(result.data || [])
      } else {
        toast.error('Failed to load claims')
      }
    } catch (error) {
      console.error('Error fetching claims:', error)
      toast.error('Failed to load claims')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchClaims()
  }, [])

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      processed: 'bg-purple-100 text-purple-800 border-purple-200',
      submitted: 'bg-blue-100 text-blue-800 border-blue-200',
      paid: 'bg-green-100 text-green-800 border-green-200',
      partially_paid: 'bg-orange-100 text-orange-800 border-orange-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    }
    return styles[status] || styles.draft
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Claims</h1>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-12">
            <LoadingSpinner size="lg" message="Loading claims..." />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Claims</h1>
            <p className="text-gray-600 mt-1">
              Manage bulk claims for transaction submission
            </p>
          </div>
          <Button
            intent="primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Create Claim
          </Button>
        </div>

        {/* Claims Table */}
        {claims.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No claims yet</h3>
            <p className="mt-2 text-sm text-gray-600">Create your first claim to group transactions for submission</p>
            <Button
              intent="primary"
              onClick={() => setShowCreateModal(true)}
              className="mt-4"
            >
              + Create First Claim
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Claim ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    TXNs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {claims.map((claim) => (
                  <tr 
                    key={claim.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/claims/${claim.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono font-medium text-blue-600">
                        {claim.claimNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {claim.createdBy}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {format(new Date(claim.createdAt), 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {claim.filtersJson?.dateFrom && claim.filtersJson?.dateTo ? (
                        <span className="whitespace-nowrap">
                          {format(new Date(claim.filtersJson.dateFrom), 'MMM d, yyyy')} - {format(new Date(claim.filtersJson.dateTo), 'MMM d, yyyy')}
                        </span>
                      ) : claim.filtersJson?.includeAll ? (
                        <span className="text-gray-500 italic">All dates</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {claim.transactionCount}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ${claim.totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(claim.status)} capitalize`}>
                        {claim.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/claims/${claim.id}`)
                        }}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Claim Modal */}
        {showCreateModal && (
          <CreateClaimModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false)
              fetchClaims()
            }}
          />
        )}
      </div>
    </div>
  )
}
