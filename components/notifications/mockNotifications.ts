// Notification type definition used by NotificationsPanel and NotificationItem

export interface Notification {
  id: string
  type: 'n8n' | 'system' | 'user'
  category: string
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  icon?: string
}
