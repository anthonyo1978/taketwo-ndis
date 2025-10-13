"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { LoadingSpinner } from 'components/ui/LoadingSpinner'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface ClaimDetail {
  id: string
  claimNumber: string
  createdBy: string
  createdAt: string
  filtersJson?: Record<string, any>
  transactionCount: number
  totalAmount: number
  status: string
  filePath?: string
  fileGeneratedAt?: string
  fileGeneratedBy?: string
  transactions: Array<{
    id: string
    residentId: string
    residentName: string
    occurredAt: string
    amount: number
    serviceCode?: string
    note?: string
    status: string
  }>
}

export default function ClaimDetailPage() {
  const params = useParams()
  const router = useRouter()
  const claimId = params.id as string

  const [claim, setClaim] = useState<ClaimDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    const fetchClaim = async () => {
      try {
        const response = await fetch(`/api/claims/${claimId}`)
        const result = await response.json() as { success: boolean; data?: ClaimDetail; error?: string }

        if (result.success && result.data) {
          setClaim(result.data)
        } else {
          toast.error('Failed to load claim')
        }
      } catch (error) {
        console.error('Error fetching claim:', error)
        toast.error('Failed to load claim')
      } finally {
        setIsLoading(false)
      }
    }

    fetchClaim()
  }, [claimId])

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      submitted: 'bg-blue-100 text-blue-800 border-blue-200',
      paid: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    }
    return styles[status] || styles.draft
  }

  const handleExportClaim = async () => {
    try {
      setIsExporting(true)
      const response = await fetch(`/api/claims/${claimId}/export`, {
        method: 'POST'
      })
      const result = await response.json() as { success: boolean; data?: any; message?: string; error?: string }

      if (result.success && result.data) {
        toast.success(result.message || 'Claim file created successfully')
        
        // Download the file
        if (result.data.downloadUrl) {
          window.open(result.data.downloadUrl, '_blank')
        }
        
        // Refresh claim data to show updated status and file info
        const refreshResponse = await fetch(`/api/claims/${claimId}`)
        const refreshResult = await refreshResponse.json() as { success: boolean; data?: ClaimDetail }
        if (refreshResult.success && refreshResult.data) {
          setClaim(refreshResult.data)
        }
      } else {
        toast.error(result.error || 'Failed to create claim file')
      }
    } catch (error) {
      console.error('Error exporting claim:', error)
      toast.error('Failed to create claim file')
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-12">
            <LoadingSpinner size="lg" message="Loading claim details..." />
          </div>
        </div>
      </div>
    )
  }

  if (!claim) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900">Claim not found</h3>
            <Link href="/claims" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
              ← Back to Claims
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm">
            <Link href="/claims" className="text-blue-600 hover:text-blue-800">
              Claims
            </Link>
            <span className="text-gray-400">→</span>
            <span className="text-gray-600">{claim.claimNumber}</span>
          </div>
        </nav>

        {/* Claim Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{claim.claimNumber}</h1>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">Created by:</span> {claim.createdBy}</p>
                <p><span className="font-medium">Date:</span> {format(new Date(claim.createdAt), 'MMMM d, yyyy h:mm a')}</p>
                {claim.filtersJson?.dateFrom && claim.filtersJson?.dateTo && (
                  <p><span className="font-medium">Transaction Date Range:</span> {format(new Date(claim.filtersJson.dateFrom), 'MMMM d, yyyy')} - {format(new Date(claim.filtersJson.dateTo), 'MMMM d, yyyy')}</p>
                )}
                {claim.filtersJson?.includeAll && (
                  <p><span className="font-medium">Transaction Date Range:</span> <span className="italic">All dates</span></p>
                )}
                <p><span className="font-medium">Transactions:</span> {claim.transactionCount}</p>
                <p><span className="font-medium">Total Amount:</span> ${claim.totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                {claim.fileGeneratedAt && (
                  <p className="text-xs text-green-600">
                    <span className="font-medium">Last exported:</span> {format(new Date(claim.fileGeneratedAt), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <button
                onClick={handleExportClaim}
                disabled={isExporting}
                className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Create Claim File
                  </>
                )}
              </button>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(claim.status)} capitalize`}>
                {claim.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Filters Used */}
          {claim.filtersJson && Object.keys(claim.filtersJson).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Filters Applied:</p>
              <div className="flex flex-wrap gap-2">
                {claim.filtersJson.residentId && (
                  <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs">
                    Resident ID: {claim.filtersJson.residentId}
                  </span>
                )}
                {claim.filtersJson.dateFrom && (
                  <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs">
                    From: {format(new Date(claim.filtersJson.dateFrom), 'MMM d, yyyy')}
                  </span>
                )}
                {claim.filtersJson.dateTo && (
                  <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs">
                    To: {format(new Date(claim.filtersJson.dateTo), 'MMM d, yyyy')}
                  </span>
                )}
                {claim.filtersJson.includeAll && (
                  <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs">
                    All Eligible Transactions
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Linked Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resident
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {claim.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        href={`/transactions?search=${tx.id}`}
                        className="text-sm font-mono text-blue-600 hover:text-blue-900 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {tx.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {tx.residentName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {format(new Date(tx.occurredAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {tx.serviceCode || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ${parseFloat(String(tx.amount)).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {tx.note || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

