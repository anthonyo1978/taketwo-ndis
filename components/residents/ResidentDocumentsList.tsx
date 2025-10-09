"use client"

import { useEffect, useState } from 'react'
import { format } from 'date-fns'

interface RenderedDocument {
  id: string
  contractId: string
  templateId: string
  templateVersion: string
  storagePath: string
  signedUrlLast?: string
  signedUrlExpiresAt?: string
  renderMs?: number
  fileSizeBytes?: number
  createdAt: string
}

interface ResidentDocumentsListProps {
  residentId: string
}

export function ResidentDocumentsList({ residentId }: ResidentDocumentsListProps) {
  const [documents, setDocuments] = useState<RenderedDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDocuments()
  }, [residentId])

  const fetchDocuments = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/residents/${residentId}/documents`)
      const result = await response.json() as {
        success: boolean
        data?: RenderedDocument[]
        error?: string
      }

      if (result.success && result.data) {
        setDocuments(result.data)
      } else {
        setError(result.error || 'Failed to load documents')
      }
    } catch (err) {
      console.error('Error fetching documents:', err)
      setError('Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getTemplateName = (templateId: string) => {
    const names: Record<string, string> = {
      'ndis_service_agreement': 'NDIS - SDA - Agreement'
    }
    return names[templateId] || templateId
  }

  const handleViewDocument = async (doc: RenderedDocument) => {
    try {
      // Get a fresh signed URL (in case the old one expired)
      const response = await fetch(`/api/rendered-documents/${doc.id}/url`)
      const result = await response.json() as {
        success: boolean
        signedUrl?: string
        error?: string
      }

      if (result.success && result.signedUrl) {
        window.open(result.signedUrl, '_blank')
      } else {
        setError(result.error || 'Failed to get document URL')
      }
    } catch (err) {
      console.error('Error getting document URL:', err)
      setError('Failed to open document')
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Loading documents...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📄</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Yet</h3>
        <p className="text-gray-500">
          Generated contract PDFs will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">📄</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900">
                {getTemplateName(doc.templateId)} {doc.templateVersion}
              </h4>
              <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                <span>
                  {format(new Date(doc.createdAt), 'dd MMM yyyy, h:mm a')}
                </span>
                <span>•</span>
                <span>{formatFileSize(doc.fileSizeBytes)}</span>
                {doc.renderMs && (
                  <>
                    <span>•</span>
                    <span>{doc.renderMs}ms</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => handleViewDocument(doc)}
            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
          >
            View PDF
          </button>
        </div>
      ))}
    </div>
  )
}

