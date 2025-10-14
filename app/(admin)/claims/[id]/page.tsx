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
  const [activeTab, setActiveTab] = useState<'transactions' | 'history'>('transactions')
  const [history, setHistory] = useState<{ logs: any[]; files: any[] } | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

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

  const fetchHistory = async () => {
    if (history) return // Already loaded
    
    try {
      setIsLoadingHistory(true)
      const response = await fetch(`/api/claims/${claimId}/history`)
      const result = await response.json() as { success: boolean; data?: { logs: any[]; files: any[] }; error?: string }

      if (result.success && result.data) {
        setHistory(result.data)
      } else {
        toast.error('Failed to load claim history')
      }
    } catch (error) {
      console.error('Error fetching history:', error)
      toast.error('Failed to load claim history')
    } finally {
      setIsLoadingHistory(false)
    }
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
        
        // Refresh claim data to show updated status and file info
        const refreshResponse = await fetch(`/api/claims/${claimId}`)
        const refreshResult = await refreshResponse.json() as { success: boolean; data?: ClaimDetail }
        if (refreshResult.success && refreshResult.data) {
          setClaim(refreshResult.data)
        }
        
        // Refresh history if it's loaded
        if (history) {
          setHistory(null) // Clear to force reload
          await fetchHistory()
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
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportClaim}
                disabled={isExporting}
                className="inline-flex items-center px-3 py-1 border border-blue-600 text-sm text-blue-600 rounded-full hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
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

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'transactions'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Linked Transactions ({claim.transactionCount})
              </button>
              <button
                onClick={() => {
                  setActiveTab('history')
                  fetchHistory()
                }}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Claim History
              </button>
            </nav>
          </div>

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
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
                    Status
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
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tx.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        tx.status === 'picked_up' ? 'bg-yellow-100 text-yellow-800' :
                        tx.status === 'submitted' ? 'bg-indigo-100 text-indigo-800' :
                        tx.status === 'paid' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      } capitalize`}>
                        {tx.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="p-6 space-y-8">
              {isLoadingHistory ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading history...</p>
                </div>
              ) : history ? (
                <>
                  {/* Exported Files Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Exported Files</h3>
                    {history.files.length > 0 ? (
                      <div className="space-y-2">
                        {history.files.map((file: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                            <div className="flex items-center space-x-3">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {file.createdAt ? format(new Date(file.createdAt), 'MMM d, yyyy h:mm a') : 'Unknown date'}
                                </p>
                              </div>
                            </div>
                            {file.downloadUrl && (
                              <a
                                href={file.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No files exported yet</p>
                    )}
                  </div>

                  {/* Activity Log Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h3>
                    {history.logs.length > 0 ? (
                      <div className="space-y-2">
                        {history.logs.map((log: any) => (
                          <div key={log.id} className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {log.action === 'create' && 'Claim Created'}
                                  {log.action === 'update' && log.details?.action === 'claim_file_generated' ? 'File Generated' : 'Claim Updated'}
                                  {log.action === 'delete' && 'Claim Deleted'}
                                </p>
                                {log.details && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    {log.details.action === 'claim_file_generated' && `${log.details.filename} - ${log.details.transactionCount} transactions`}
                                    {log.details.claimNumber && !log.details.filename && `Claim: ${log.details.claimNumber}`}
                                  </p>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                {format(new Date(log.createdAt), 'MMM d, yyyy h:mm a')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No activity recorded</p>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

