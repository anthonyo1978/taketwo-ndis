"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { LoadingSpinner } from 'components/ui/LoadingSpinner'
import { Button } from 'components/Button/Button'
import { useTodos } from 'lib/contexts/TodoContext'

interface Notification {
  id: string
  organization_id: string
  title: string
  message: string
  icon: string | null
  category: 'system' | 'automation' | 'billing' | 'n8n' | 'user' | 'other'
  priority: 'low' | 'medium' | 'high'
  action_url: string | null
  read: boolean
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  created_by: string | null
}

type TabType = 'details' | 'metadata' | 'related'

export default function NotificationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const notificationId = params.id as string
  const { createTodoFromNotification } = useTodos()

  const [notification, setNotification] = useState<Notification | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('details')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchNotification = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/notifications/${notificationId}`)
        const result = await response.json() as { success: boolean; data?: Notification; error?: string }

        if (result.success && result.data) {
          setNotification(result.data)
        } else {
          toast.error(result.error || 'Failed to load notification')
          router.push('/notifications')
        }
      } catch (error) {
        console.error('Error fetching notification:', error)
        toast.error('Failed to load notification')
        router.push('/notifications')
      } finally {
        setIsLoading(false)
      }
    }

    if (notificationId) {
      fetchNotification()
    }
  }, [notificationId, router])

  const handleMarkAsRead = async (read: boolean) => {
    if (!notification) return

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read })
      })

      if (response.ok) {
        setNotification({ ...notification, read })
        toast.success(`Notification marked as ${read ? 'read' : 'unread'}`)
      } else {
        toast.error('Failed to update notification')
      }
    } catch (error) {
      console.error('Error updating notification:', error)
      toast.error('Failed to update notification')
    }
  }

  const handleDelete = async () => {
    if (!notification) return

    if (!confirm('Are you sure you want to delete this notification?')) {
      return
    }

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Notification deleted')
        router.push('/notifications')
      } else {
        toast.error('Failed to delete notification')
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('Failed to delete notification')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCreateTodo = () => {
    if (!notification) return
    createTodoFromNotification(
      notification.id,
      notification.title,
      notification.message
    )
    toast.success('Todo created from notification')
  }

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      system: 'bg-gray-100 text-gray-800 border-gray-200',
      automation: 'bg-blue-100 text-blue-800 border-blue-200',
      billing: 'bg-green-100 text-green-800 border-green-200',
      n8n: 'bg-purple-100 text-purple-800 border-purple-200',
      user: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      other: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return styles[category] || styles.other
  }

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: 'bg-gray-100 text-gray-700 border-gray-300',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      high: 'bg-red-100 text-red-700 border-red-300'
    }
    return styles[priority] || styles.medium
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-12">
            <LoadingSpinner size="lg" message="Loading notification..." />
          </div>
        </div>
      </div>
    )
  }

  if (!notification) {
    return null
  }

  const hasMetadata = notification.metadata && typeof notification.metadata === 'object' && Object.keys(notification.metadata).length > 0

  // Safe date formatting
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMMM d, yyyy h:mm a')
    } catch {
      return dateString
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm">
            <Link href="/notifications" className="text-blue-600 hover:text-blue-800">
              Notifications
            </Link>
            <span className="text-gray-400">→</span>
            <span className="text-gray-600 truncate max-w-md">{notification.title}</span>
          </div>
        </nav>

        {/* Notification Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                {notification.icon && (
                  <span className="text-3xl">{notification.icon}</span>
                )}
                <h1 className="text-3xl font-bold text-gray-900">{notification.title}</h1>
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getCategoryBadge(notification.category)}`}>
                  {notification.category}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPriorityBadge(notification.priority)}`}>
                  {notification.priority}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${notification.read ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>
                  {notification.read ? 'Read' : 'Unread'}
                </span>
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">Created:</span> {formatDate(notification.created_at)}</p>
                <p><span className="font-medium">Updated:</span> {formatDate(notification.updated_at)}</p>
                {notification.action_url && (
                  <p><span className="font-medium">Action URL:</span> <Link href={notification.action_url} className="text-blue-600 hover:underline">{notification.action_url}</Link></p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              {notification.action_url && (
                <Button
                  onClick={() => router.push(notification.action_url!)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  View Action
                </Button>
              )}
              <Button
                onClick={() => handleMarkAsRead(!notification.read)}
                className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                  notification.read
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {notification.read ? 'Mark Unread' : 'Mark Read'}
              </Button>
              <Button
                onClick={handleCreateTodo}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Create Todo
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Details
              </button>
              {hasMetadata && (
                <button
                  onClick={() => setActiveTab('metadata')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'metadata'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Metadata
                </button>
              )}
              <button
                onClick={() => setActiveTab('related')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'related'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Related Items
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Message</h3>
                  <p className="text-gray-900 whitespace-pre-wrap">{notification.message}</p>
                </div>
              </div>
            )}

            {activeTab === 'metadata' && hasMetadata && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-4">Raw Metadata (JSON)</h3>
                <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto text-sm">
                  {JSON.stringify(notification.metadata, null, 2)}
                </pre>
              </div>
            )}

            {activeTab === 'related' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Related Todos</h3>
                  <p className="text-gray-600 text-sm">
                    Todos created from this notification will appear here.
                    {notification.action_url && (
                      <> You can create a todo using the "Create Todo" button above.</>
                    )}
                  </p>
                </div>
                {/* TODO: Fetch and display related todos when API supports it */}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

