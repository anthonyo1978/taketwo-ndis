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
  const [history, setHistory] = useState<{ logs: any[]; files: any[]; reconciliations: any[] } | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [filesPage, setFilesPage] = useState(1)
  const [logsPage, setLogsPage] = useState(1)
  const pageSize = 10
  const [showApiWarningModal, setShowApiWarningModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [uploadResults, setUploadResults] = useState<any>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [transactionDetail, setTransactionDetail] = useState<any>(null)
  const [isLoadingTransaction, setIsLoadingTransaction] = useState(false)

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
      processed: 'bg-purple-100 text-purple-800 border-purple-200',
      submitted: 'bg-blue-100 text-blue-800 border-blue-200',
      paid: 'bg-green-100 text-green-800 border-green-200',
      partially_paid: 'bg-orange-100 text-orange-800 border-orange-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      automation_submitted: 'bg-blue-100 text-blue-800 border-blue-200',
      auto_processed: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    }
    return styles[status] || styles.draft
  }

  const fetchHistory = async () => {
    if (history) return // Already loaded
    
    try {
      setIsLoadingHistory(true)
      const response = await fetch(`/api/claims/${claimId}/history`)
      const result = await response.json() as { success: boolean; data?: { logs: any[]; files: any[]; reconciliations: any[] }; error?: string }

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

  const handleViewTransaction = async (transactionId: string) => {
    try {
      setSelectedTransactionId(transactionId)
      setIsLoadingTransaction(true)
      
      const response = await fetch(`/api/transactions/${transactionId}`)
      const result = await response.json() as { success: boolean; data?: any; error?: string }
      
      if (result.success && result.data) {
        setTransactionDetail(result.data)
      } else {
        toast.error('Failed to load transaction details')
        setSelectedTransactionId(null)
      }
    } catch (error) {
      console.error('Error fetching transaction:', error)
      toast.error('Failed to load transaction details')
      setSelectedTransactionId(null)
    } finally {
      setIsLoadingTransaction(false)
    }
  }

  const handleCloseTransactionModal = () => {
    setSelectedTransactionId(null)
    setTransactionDetail(null)
  }

  const handleFileSelect = (file: File) => {
    if (file.name.endsWith('.csv')) {
      setSelectedFile(file)
    } else {
      toast.error('Only CSV files are supported')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleUploadResponse = async () => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(`/api/claims/${claimId}/upload-response`, {
        method: 'POST',
        body: formData
      })
      const result = await response.json() as { success: boolean; data?: any; message?: string; error?: string }

      if (result.success && result.data) {
        setUploadResults(result.data)
        setShowUploadModal(false)
        setShowSummaryModal(true)
        setSelectedFile(null)
        
        // Refresh claim data
        const refreshResponse = await fetch(`/api/claims/${claimId}`)
        const refreshResult = await refreshResponse.json() as { success: boolean; data?: ClaimDetail }
        if (refreshResult.success && refreshResult.data) {
          setClaim(refreshResult.data)
        }
        
        // Refresh history if loaded
        if (history) {
          setHistory(null)
          await fetchHistory()
        }
      } else {
        toast.error(result.error || 'Failed to process response file')
      }
    } catch (error) {
      console.error('Error uploading response:', error)
      toast.error('Failed to upload response file')
    } finally {
      setIsUploading(false)
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
          setFilesPage(1) // Reset pagination
          setLogsPage(1)
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

  const handleSimulatePayment = async () => {
    try {
      // Close the modal first
      setShowApiWarningModal(false)
      
      // Update claim status to automation_submitted
      const response = await fetch(`/api/claims/${claimId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'automation_submitted' })
      })
      
      if (response.ok) {
        // Refresh claim data to show updated status
        const refreshResponse = await fetch(`/api/claims/${claimId}`)
        const refreshResult = await refreshResponse.json() as { success: boolean; data?: ClaimDetail }
        if (refreshResult.success && refreshResult.data) {
          setClaim(refreshResult.data)
        }
        
        // After 10 seconds, update to auto_processed
        setTimeout(async () => {
          const autoProcessResponse = await fetch(`/api/claims/${claimId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'auto_processed' })
          })
          
          if (autoProcessResponse.ok) {
            // Refresh claim data again
            const finalRefreshResponse = await fetch(`/api/claims/${claimId}`)
            const finalRefreshResult = await finalRefreshResponse.json() as { success: boolean; data?: ClaimDetail }
            if (finalRefreshResult.success && finalRefreshResult.data) {
              setClaim(finalRefreshResult.data)
            }
          }
        }, 10000) // 10 seconds delay
        
        toast.success('Payment simulation started - claim status will update automatically')
      } else {
        toast.error('Failed to start payment simulation')
      }
    } catch (error) {
      console.error('Error simulating payment:', error)
      toast.error('Failed to simulate payment')
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
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center px-3 py-1 border border-green-600 text-sm text-green-600 rounded-full hover:bg-green-50 transition-colors font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Response
              </button>
              <button
                onClick={() => setShowApiWarningModal(true)}
                className="inline-flex items-center px-3 py-1 border border-purple-600 text-sm text-purple-600 rounded-full hover:bg-purple-50 transition-colors font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Auto Claim
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
                Claim Logs and Files
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
                      <button
                        onClick={() => handleViewTransaction(tx.id)}
                        className="text-sm font-mono text-blue-600 hover:text-blue-900 hover:underline"
                      >
                        {tx.id}
                      </button>
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
                        tx.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-orange-100 text-orange-800'
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
                  {/* Files Section - Grouped by Type */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Files</h3>
                    {history.files.length > 0 ? (
                      <div className="space-y-6">
                        {/* Claim Exports */}
                        {(() => {
                          const claimExports = history.files.filter((f: any) => f.name.startsWith('HAVEN-CLAIM-'))
                          return claimExports.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-blue-700 mb-2">Claim Exports ({claimExports.length})</h4>
                              <div className="space-y-1 pl-4 border-l-2 border-blue-200">
                                {claimExports.map((file: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between py-2">
                                    <div className="flex items-center space-x-3">
                                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      <div>
                                        <p className="text-sm text-gray-900">{file.name}</p>
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
                                        className="text-sm text-blue-600 hover:text-blue-800"
                                      >
                                        Download →
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })()}

                        {/* Response Files */}
                        {(() => {
                          const responseFiles = history.files.filter((f: any) => f.name.startsWith('RESPONSE-') && !f.name.startsWith('ERRORS-'))
                          return responseFiles.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-green-700 mb-2">Response Files ({responseFiles.length})</h4>
                              <div className="space-y-1 pl-4 border-l-2 border-green-200">
                                {responseFiles.map((file: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between py-2">
                                    <div className="flex items-center space-x-3">
                                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                      </svg>
                                      <div>
                                        <p className="text-sm text-gray-900">{file.name}</p>
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
                                        className="text-sm text-green-600 hover:text-green-800"
                                      >
                                        Download →
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })()}

                        {/* Error Reports */}
                        {(() => {
                          const errorFiles = history.files.filter((f: any) => f.name.startsWith('ERRORS-'))
                          return errorFiles.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-orange-700 mb-2">Error Reports ({errorFiles.length})</h4>
                              <div className="space-y-1 pl-4 border-l-2 border-orange-200">
                                {errorFiles.map((file: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between py-2">
                                    <div className="flex items-center space-x-3">
                                      <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                      </svg>
                                      <div>
                                        <p className="text-sm text-gray-900">{file.name}</p>
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
                                        className="text-sm text-orange-600 hover:text-orange-800"
                                      >
                                        Download →
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No files yet</p>
                    )}
                  </div>

                  {/* Logs Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Logs</h3>
                    {history.logs.length > 0 ? (
                      <>
                        <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs space-y-1">
                          {history.logs
                            .slice((logsPage - 1) * pageSize, logsPage * pageSize)
                            .map((log: any) => {
                              let logMessage = ''
                              if (log.action === 'create') {
                                logMessage = `Claim Created`
                                if (log.details?.claimNumber) {
                                  logMessage += ` (${log.details.claimNumber})`
                                }
                              } else if (log.action === 'update') {
                                if (log.details?.action === 'claim_file_generated') {
                                  logMessage = `File Generated: ${log.details.filename || 'claim file'}`
                                  if (log.details.transactionCount) {
                                    logMessage += ` (${log.details.transactionCount} transactions)`
                                  }
                                } else if (log.details?.action === 'claim_response_uploaded') {
                                  const r = log.details.results
                                  logMessage = `Response Uploaded: ${log.details.fileName || 'response file'}`
                                  if (r) {
                                    logMessage += ` (${r.totalPaid || 0} paid, ${r.totalRejected || 0} rejected, ${r.totalErrors || 0} errors)`
                                  }
                                } else {
                                  logMessage = 'Claim Updated'
                                }
                              } else if (log.action === 'delete') {
                                logMessage = 'Claim Deleted'
                              } else {
                                logMessage = log.action
                              }

                              return (
                                <div key={log.id} className="text-gray-700">
                                  <span className="text-gray-500">{format(new Date(log.createdAt), 'MMM d, yyyy h:mm a')}</span>
                                  <span className="text-gray-400 mx-2">-</span>
                                  <span>{logMessage}</span>
                                </div>
                              )
                            })}
                        </div>
                        {/* Logs Pagination */}
                        {history.logs.length > pageSize && (
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              Showing {((logsPage - 1) * pageSize) + 1} to {Math.min(logsPage * pageSize, history.logs.length)} of {history.logs.length} logs
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                                disabled={logsPage === 1}
                                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                              >
                                Previous
                              </button>
                              <button
                                onClick={() => setLogsPage(p => Math.min(Math.ceil(history.logs.length / pageSize), p + 1))}
                                disabled={logsPage >= Math.ceil(history.logs.length / pageSize)}
                                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">No activity recorded</p>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Upload Response Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Upload Claim Response
                </h3>
                
                {/* Drag and Drop Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {selectedFile ? (
                    <div className="space-y-3">
                      <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="mt-4">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <span className="text-blue-600 hover:text-blue-700 font-medium">
                            Click to upload
                          </span>
                          <span className="text-gray-600"> or drag and drop</span>
                          <input
                            id="file-upload"
                            type="file"
                            accept=".csv"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileSelect(file)
                            }}
                            className="sr-only"
                          />
                        </label>
                        <p className="text-xs text-gray-500 mt-1">CSV files only</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowUploadModal(false)
                      setSelectedFile(null)
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadResponse}
                    disabled={!selectedFile || isUploading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isUploading ? (
                      <>
                        <svg className="animate-spin inline-block -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      'Upload & Process'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Processing Summary Modal */}
        {showSummaryModal && uploadResults && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
              <div className="p-6">
                <div className="flex items-start mb-4">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      Response File Processed
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Claim status updated to: <span className="font-medium capitalize">{uploadResults.claimStatus?.replace(/_/g, ' ')}</span>
                    </p>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">{uploadResults.results?.totalPaid || 0}</p>
                    <p className="text-xs text-green-600 mt-1">Paid</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-700">{uploadResults.results?.totalRejected || 0}</p>
                    <p className="text-xs text-red-600 mt-1">Rejected</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-700">{uploadResults.results?.totalErrors || 0}</p>
                    <p className="text-xs text-yellow-600 mt-1">Errors</p>
                  </div>
                </div>

                {/* Warnings */}
                {(uploadResults.results?.amountMismatches?.length > 0 || uploadResults.results?.totalUnmatched > 0) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">Warnings</h4>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      {uploadResults.results.totalUnmatched > 0 && (
                        <li>• {uploadResults.results.totalUnmatched} transaction(s) in response file could not be matched</li>
                      )}
                      {uploadResults.results.amountMismatches?.length > 0 && (
                        <li>• {uploadResults.results.amountMismatches.length} transaction(s) have amount mismatches (check transaction notes)</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowSummaryModal(false)
                      setUploadResults(null)
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Detail Modal */}
        {selectedTransactionId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Transaction Details</h3>
                <button
                  onClick={handleCloseTransactionModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                {isLoadingTransaction ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading transaction...</p>
                  </div>
                ) : transactionDetail ? (
                  <div className="space-y-4">
                    {/* Transaction Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Transaction ID</label>
                        <p className="text-sm font-mono text-gray-900">{transactionDetail.id}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <div>
                          <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transactionDetail.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            transactionDetail.status === 'picked_up' ? 'bg-yellow-100 text-yellow-800' :
                            transactionDetail.status === 'submitted' ? 'bg-indigo-100 text-indigo-800' :
                            transactionDetail.status === 'paid' ? 'bg-green-100 text-green-800' :
                            transactionDetail.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-orange-100 text-orange-800'
                          } capitalize`}>
                            {transactionDetail.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Claim ID</label>
                        {transactionDetail.claimNumber ? (
                          <p className="text-sm font-mono text-blue-600">{transactionDetail.claimNumber}</p>
                        ) : (
                          <p className="text-sm text-gray-400 italic">Not claimed</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Amount</label>
                        <p className="text-sm font-medium text-gray-900">
                          ${parseFloat(String(transactionDetail.amount)).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Service Date</label>
                        <p className="text-sm text-gray-900">
                          {format(new Date(transactionDetail.occurredAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Service Code</label>
                        <p className="text-sm text-gray-900">{transactionDetail.serviceCode || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Resident</label>
                        <p className="text-sm text-gray-900">{transactionDetail.residentName || 'Unknown'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">House</label>
                        <p className="text-sm text-gray-900">{transactionDetail.houseName || 'Unknown'}</p>
                      </div>
                    </div>

                    {/* Note */}
                    {transactionDetail.note && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Note</label>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">
                          {transactionDetail.note}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={handleCloseTransactionModal}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                      >
                        Close
                      </button>
                      <Link
                        href={`/transactions?search=${transactionDetail.id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        View Full Details →
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* API Warning Modal */}
        {showApiWarningModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      API Integration Not Enabled
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">
                      NDIA API settings not enabled, please contact your Administrator to enable this automation.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex justify-between">
                  <button
                    onClick={handleSimulatePayment}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                  >
                    Simulate Payment
                  </button>
                  <button
                    onClick={() => setShowApiWarningModal(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

