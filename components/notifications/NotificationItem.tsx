"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Clipboard, CheckCircle2, Circle } from 'lucide-react'
import { Notification } from './mockNotifications'
import { useTodos } from 'lib/contexts/TodoContext'

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
}

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const router = useRouter()
  const { createTodoFromNotification } = useTodos()
  const timeAgo = formatDistanceToNow(notification.timestamp, { addSuffix: true })
  
  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    // Navigate to detail page when clicking the notification
    e.preventDefault()
    router.push(`/notifications/${notification.id}`)
  }

  const handleCreateTodo = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    createTodoFromNotification(
      notification.id,
      notification.title,
      notification.message
    )
    // Optionally mark notification as read when creating todo
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }
  }

  const content = (
    <div
      onClick={handleClick}
      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
        notification.read
          ? 'bg-white border-gray-200 hover:bg-gray-50'
          : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg">
            {notification.icon || '🔔'}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-sm font-semibold ${
              notification.read ? 'text-gray-700' : 'text-gray-900'
            }`}>
              {notification.title}
            </h4>
            {!notification.read && (
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-2">
            {/* Left side - Mark as read button + timestamp */}
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleMarkAsRead(e)
                }}
                className="flex items-center gap-1.5 p-1 hover:bg-gray-100 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                title={notification.read ? 'Mark as unread' : 'Read'}
              >
                {notification.read ? (
                  <CheckCircle2 className="size-4 text-green-500" />
                ) : (
                  <Circle className="size-4 text-gray-400 hover:text-green-500" />
                )}
                <span className="text-xs text-gray-500">
                  Read
                </span>
              </button>
              <span className="text-xs text-gray-500">{timeAgo}</span>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              {/* Create todo button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleCreateTodo(e)
                }}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Create todo from this notification"
              >
                <Clipboard className="size-3.5" />
              </button>
              {/* View link - only show if actionUrl exists */}
              {notification.actionUrl && (
                <Link
                  href={notification.actionUrl}
                  onClick={(e) => {
                    e.stopPropagation()
                    // Mark as read when clicking view link
                    if (!notification.read) {
                      handleMarkAsRead(e)
                    }
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  View →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return content
}
