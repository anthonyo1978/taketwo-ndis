"use client"

import { useState, useEffect } from 'react'
import { Bell, ChevronRight, CheckCheck, Clipboard } from 'lucide-react'
import { Notification, generateMockNotifications } from './mockNotifications'
import { NotificationItem } from './NotificationItem'
import { TodoList } from './TodoList'
import { useTodos } from 'lib/contexts/TodoContext'

const STORAGE_KEY = "notifications-panel-collapsed"

type TabType = 'notifications' | 'todos'

/**
 * NotificationsPanel - Right-side collapsible panel with Notifications and To-do list
 * 
 * Similar to AdminSidebar but on the right side, displaying notifications
 * from N8N workflows, system events, and user actions, plus a to-do list.
 * 
 * Feature flag: NEXT_PUBLIC_ENABLE_NOTIFICATIONS
 * Set to 'true' to enable, 'false' to disable (easy removal)
 */
export function NotificationsPanel() {
  // Feature flag check
  const isEnabled = process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS === 'true'
  
  // Debug log (remove after confirming it works)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[NotificationsPanel] Feature flag:', {
        envVar: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS,
        isEnabled
      })
    }
  }, [isEnabled])
  
  if (!isEnabled) {
    return null
  }

  const { todayCount } = useTodos()
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('unread')
  const [activeTab, setActiveTab] = useState<TabType>('notifications')
  const [havenMode, setHavenMode] = useState(false)

  // Load collapsed state and Haven mode from localStorage
  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setIsCollapsed(JSON.parse(stored) as boolean)
    }
    // Load Haven mode
    const storedHavenMode = localStorage.getItem('haven-mode-enabled')
    if (storedHavenMode !== null) {
      setHavenMode(JSON.parse(storedHavenMode) as boolean)
    }
  }, [])

  // Listen for Haven mode changes (when toggled in settings)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'haven-mode-enabled') {
        setHavenMode(e.newValue === 'true')
      }
    }
    window.addEventListener('storage', handleStorageChange)
    // Also listen for changes in the same window
    const interval = setInterval(() => {
      const stored = localStorage.getItem('haven-mode-enabled')
      if (stored !== null) {
        const newValue = JSON.parse(stored) as boolean
        if (newValue !== havenMode) {
          setHavenMode(newValue)
        }
      }
    }, 500) // Check every 500ms

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [havenMode])

  // Load mock notifications
  useEffect(() => {
    if (mounted) {
      setNotifications(generateMockNotifications())
    }
  }, [mounted])

  // Save collapsed state to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(isCollapsed))
    }
  }, [isCollapsed, mounted])

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed)
  }

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    )
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications

  // Group notifications by time
  const groupedNotifications = {
    unread: filteredNotifications.filter(n => !n.read),
    today: filteredNotifications.filter(n => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return n.read && n.timestamp >= today
    }),
    thisWeek: filteredNotifications.filter(n => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return n.read && n.timestamp >= weekAgo && n.timestamp < new Date(new Date().setHours(0, 0, 0, 0))
    }),
    older: filteredNotifications.filter(n => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return n.read && n.timestamp < weekAgo
    })
  }

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <aside className={`bg-white border-l border-gray-200 ${isCollapsed ? 'w-12' : 'w-80'} transition-all duration-300`}>
        <div className="h-full flex flex-col">
          <div className="p-3">
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </aside>
    )
  }

  // Night sky background with stars for Haven mode
  const havenModeStyles = havenMode ? {
    background: `
      linear-gradient(to bottom, #0a0e27 0%, #1a1f3a 25%, #2d1b3d 50%, #1a1f3a 75%, #0a0e27 100%),
      radial-gradient(2px 2px at 20% 30%, white, transparent),
      radial-gradient(2px 2px at 60% 70%, white, transparent),
      radial-gradient(1px 1px at 50% 50%, white, transparent),
      radial-gradient(1px 1px at 80% 10%, white, transparent),
      radial-gradient(2px 2px at 90% 40%, white, transparent),
      radial-gradient(1px 1px at 33% 60%, white, transparent),
      radial-gradient(1px 1px at 70% 80%, white, transparent),
      radial-gradient(2px 2px at 40% 20%, white, transparent),
      radial-gradient(1px 1px at 10% 50%, white, transparent),
      radial-gradient(1px 1px at 85% 60%, white, transparent),
      radial-gradient(2px 2px at 25% 80%, white, transparent),
      radial-gradient(1px 1px at 55% 10%, white, transparent),
      radial-gradient(1px 1px at 15% 70%, white, transparent),
      radial-gradient(2px 2px at 75% 30%, white, transparent),
      radial-gradient(1px 1px at 45% 90%, white, transparent),
      radial-gradient(1px 1px at 95% 20%, white, transparent),
      radial-gradient(2px 2px at 30% 40%, white, transparent),
      radial-gradient(1px 1px at 65% 50%, white, transparent),
      radial-gradient(1px 1px at 5% 30%, white, transparent)
    `,
    backgroundSize: '100% 100%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%',
    backgroundRepeat: 'no-repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat',
    position: 'relative' as const
  } : {}

  return (
    <aside 
      className={`${havenMode ? 'border-l border-gray-600' : 'bg-white border-l border-gray-200'} ${isCollapsed ? 'w-12' : 'w-80'} transition-all duration-300 flex-shrink-0`}
      style={havenModeStyles}
    >
      <div className={`h-full flex flex-col ${havenMode ? 'text-white' : ''}`}>
        {/* Header - Collapsed state shows both icons with badges */}
        <div className={`py-4 flex items-center ${isCollapsed ? 'flex-col gap-3 px-2' : 'px-4 justify-between'} ${havenMode ? 'border-b border-gray-700' : ''}`}>
          {isCollapsed ? (
            <>
              {/* Notifications Icon */}
              <button
                onClick={() => {
                  setActiveTab('notifications')
                  setIsCollapsed(false)
                }}
                className={`relative p-2 ${havenMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
                aria-label="Expand notifications"
              >
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-semibold text-white bg-red-500 rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* To-do Icon */}
              <button
                onClick={() => {
                  setActiveTab('todos')
                  setIsCollapsed(false)
                }}
                className={`relative p-2 ${havenMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
                aria-label="Expand to-do list"
              >
                <Clipboard className="size-5" />
                {todayCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-semibold text-white bg-blue-500 rounded-full">
                    {todayCount > 9 ? '9+' : todayCount}
                  </span>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {activeTab === 'notifications' ? (
                  <>
                    <Bell className={`size-5 ${havenMode ? 'text-white' : 'text-gray-700'}`} />
                    <h2 className={`text-lg font-semibold ${havenMode ? 'text-white' : 'text-gray-900'}`}>Notifications</h2>
                    {unreadCount > 0 && (
                      <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-red-500 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <Clipboard className={`size-5 ${havenMode ? 'text-white' : 'text-gray-700'}`} />
                    <h2 className={`text-lg font-semibold ${havenMode ? 'text-white' : 'text-gray-900'}`}>To-dos</h2>
                    {todayCount > 0 && (
                      <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-blue-500 rounded-full">
                        {todayCount}
                      </span>
                    )}
                  </>
                )}
              </div>
              <button
                onClick={toggleCollapsed}
                className={`p-1.5 ${havenMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
                aria-label="Collapse panel"
              >
                <ChevronRight className="size-4" />
              </button>
            </>
          )}
        </div>

        {/* Content - Only show when expanded */}
        {!isCollapsed && (
          <>
            {/* Tabs */}
            <div className={`px-4 pb-3 border-b ${havenMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'notifications'
                      ? havenMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 text-blue-700'
                      : havenMode
                        ? 'text-gray-300 hover:bg-gray-800'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Bell className="size-4" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-semibold text-white bg-red-500 rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('todos')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'todos'
                      ? havenMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 text-blue-700'
                      : havenMode
                        ? 'text-gray-300 hover:bg-gray-800'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Clipboard className="size-4" />
                  To-dos
                  {todayCount > 0 && (
                    <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-semibold text-white bg-blue-500 rounded-full">
                      {todayCount > 9 ? '9+' : todayCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'notifications' ? (
              <>
                {/* Filter tabs */}
                <div className={`px-4 py-3 border-b ${havenMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilter('unread')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        filter === 'unread'
                          ? havenMode
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-100 text-blue-700'
                          : havenMode
                            ? 'text-gray-300 hover:bg-gray-800'
                            : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Unread
                    </button>
                    <button
                      onClick={() => setFilter('all')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        filter === 'all'
                          ? havenMode
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-100 text-blue-700'
                          : havenMode
                            ? 'text-gray-300 hover:bg-gray-800'
                            : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      All
                    </button>
                  </div>
                </div>

                {/* Notifications list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Unread section */}
                  {groupedNotifications.unread.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Unread
                        </h3>
                        {groupedNotifications.unread.length > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                          >
                            <CheckCheck className="size-3" />
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {groupedNotifications.unread.map(notification => (
                          <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={markAsRead}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Today section */}
                  {filter === 'all' && groupedNotifications.today.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Today
                      </h3>
                      <div className="space-y-2">
                        {groupedNotifications.today.map(notification => (
                          <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={markAsRead}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* This week section */}
                  {filter === 'all' && groupedNotifications.thisWeek.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        This Week
                      </h3>
                      <div className="space-y-2">
                        {groupedNotifications.thisWeek.map(notification => (
                          <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={markAsRead}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Older section */}
                  {filter === 'all' && groupedNotifications.older.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Older
                      </h3>
                      <div className="space-y-2">
                        {groupedNotifications.older.map(notification => (
                          <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={markAsRead}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {filteredNotifications.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="size-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm font-medium">No notifications</p>
                      <p className="text-xs mt-1">
                        {filter === 'unread' ? 'All caught up!' : 'No notifications to show'}
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <TodoList />
            )}
          </>
        )}
      </div>
    </aside>
  )
}
