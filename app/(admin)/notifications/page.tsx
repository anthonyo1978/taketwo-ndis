"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from 'components/Button/Button'
import { LoadingSpinner } from 'components/ui/LoadingSpinner'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface Notification {
  id: string
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
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Filter state
  const [searchValue, setSearchValue] = useState('')
  const [categoryValue, setCategoryValue] = useState('')
  const [priorityValue, setPriorityValue] = useState('')
  const [readStatusValue, setReadStatusValue] = useState('')
  const [dateFromValue, setDateFromValue] = useState('')
  const [dateToValue, setDateToValue] = useState('')

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    unread: 0
  })

  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/notifications')
      const result = await response.json() as { success: boolean; data?: Notification[]; error?: string }

      if (result.success && result.data) {
        setNotifications(result.data || [])
        
        // Calculate stats
        const unread = (result.data || []).filter(n => !n.read).length
        setStats({
          total: result.data.length,
          unread
        })
      } else {
        toast.error('Failed to load notifications')
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      toast.error('Failed to load notifications')
    } finally {
      setIsLoading(false)
    }
  }

  // Apply filters whenever notifications or filter values change
  useEffect(() => {
    let filtered = [...notifications]

    // Search filter (title/message)
    if (searchValue) {
      const searchLower = searchValue.toLowerCase()
      filtered = filtered.filter(notif =>
        notif.title.toLowerCase().includes(searchLower) ||
        notif.message.toLowerCase().includes(searchLower)
      )
    }

    // Category filter
    if (categoryValue) {
      filtered = filtered.filter(notif => notif.category === categoryValue)
    }

    // Priority filter
    if (priorityValue) {
      filtered = filtered.filter(notif => notif.priority === priorityValue)
    }

    // Read status filter
    if (readStatusValue !== '') {
      const isRead = readStatusValue === 'read'
      filtered = filtered.filter(notif => notif.read === isRead)
    }

    // Date range filter
    if (dateFromValue) {
      const fromDate = new Date(dateFromValue)
      fromDate.setHours(0, 0, 0, 0)
      filtered = filtered.filter(notif => {
        const notifDate = new Date(notif.created_at)
        return notifDate >= fromDate
      })
    }

    if (dateToValue) {
      const toDate = new Date(dateToValue)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(notif => {
        const notifDate = new Date(notif.created_at)
        return notifDate <= toDate
      })
    }

    setFilteredNotifications(filtered)
  }, [notifications, searchValue, categoryValue, priorityValue, readStatusValue, dateFromValue, dateToValue])

  useEffect(() => {
    fetchNotifications()
  }, [])

  const handleSearchSubmit = (value: string) => {
    setSearchValue(value)
  }

  const handleExport = async () => {
    try {
      // Build CSV content
      const headers = ['ID', 'Title', 'Message', 'Category', 'Priority', 'Read', 'Created At', 'Updated At']
      const rows = filteredNotifications.map(notif => [
        notif.id,
        `"${notif.title.replace(/"/g, '""')}"`,
        `"${notif.message.replace(/"/g, '""')}"`,
        notif.category,
        notif.priority,
        notif.read ? 'Yes' : 'No',
        format(new Date(notif.created_at), 'yyyy-MM-dd HH:mm:ss'),
        format(new Date(notif.updated_at), 'yyyy-MM-dd HH:mm:ss')
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `notifications-${format(new Date(), 'yyyy-MM-dd')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Notifications exported successfully')
    } catch (error) {
      console.error('Error exporting notifications:', error)
      toast.error('Failed to export notifications')
    }
  }

  const handleBulkMarkAsRead = async () => {
    if (selectedIds.size === 0) return

    try {
      const promises = Array.from(selectedIds).map(id =>
        fetch(`/api/notifications/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ read: true })
        })
      )

      await Promise.all(promises)
      toast.success(`Marked ${selectedIds.size} notification(s) as read`)
      setSelectedIds(new Set())
      await fetchNotifications()
    } catch (error) {
      console.error('Error marking notifications as read:', error)
      toast.error('Failed to mark notifications as read')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedIds.size} notification(s)?`)) {
      return
    }

    try {
      const promises = Array.from(selectedIds).map(id =>
        fetch(`/api/notifications/${id}`, {
          method: 'DELETE'
        })
      )

      await Promise.all(promises)
      toast.success(`Deleted ${selectedIds.size} notification(s)`)
      setSelectedIds(new Set())
      await fetchNotifications()
    } catch (error) {
      console.error('Error deleting notifications:', error)
      toast.error('Failed to delete notifications')
    }
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredNotifications.map(n => n.id)))
    }
  }

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
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
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-12">
            <LoadingSpinner size="lg" message="Loading notifications..." />
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
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-1">
              Manage and view all system notifications
            </p>
          </div>
          {/* Stats */}
          <div className="flex gap-4 text-sm">
            <div className="px-3 py-1 bg-gray-100 rounded-lg">
              <span className="text-gray-600">Total: </span>
              <span className="font-semibold text-gray-900">{stats.total}</span>
            </div>
            <div className="px-3 py-1 bg-blue-100 rounded-lg">
              <span className="text-blue-600">Unread: </span>
              <span className="font-semibold text-blue-900">{stats.unread}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search title or message..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              {searchValue && (
                <button
                  onClick={() => setSearchValue('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear search"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Category */}
            <select
              value={categoryValue}
              onChange={(e) => setCategoryValue(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">All Categories</option>
              <option value="system">System</option>
              <option value="automation">Automation</option>
              <option value="billing">Billing</option>
              <option value="n8n">n8n</option>
              <option value="user">User</option>
              <option value="other">Other</option>
            </select>

            {/* Priority */}
            <select
              value={priorityValue}
              onChange={(e) => setPriorityValue(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>

            {/* Read Status */}
            <select
              value={readStatusValue}
              onChange={(e) => setReadStatusValue(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">All Status</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>

            {/* Date From */}
            <input
              type="date"
              value={dateFromValue}
              onChange={(e) => setDateFromValue(e.target.value)}
              max={dateToValue || new Date().toISOString().split('T')[0]}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="From date"
            />

            {/* Date To */}
            <input
              type="date"
              value={dateToValue}
              onChange={(e) => setDateToValue(e.target.value)}
              min={dateFromValue || undefined}
              max={new Date().toISOString().split('T')[0]}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="To date"
            />
          </div>

          {/* Bulk Actions & Export */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <div className="flex gap-2">
              {selectedIds.size > 0 && (
                <>
                  <Button
                    onClick={handleBulkMarkAsRead}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Mark {selectedIds.size} as Read
                  </Button>
                  <Button
                    onClick={handleBulkDelete}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Delete {selectedIds.size}
                  </Button>
                </>
              )}
            </div>
            <Button
              onClick={handleExport}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* Notifications Table */}
        {filteredNotifications.length === 0 && notifications.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No notifications yet</h3>
            <p className="mt-2 text-sm text-gray-600">Notifications will appear here when system events occur</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900">No notifications match your filters</h3>
            <p className="mt-2 text-sm text-gray-600">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredNotifications.length && filteredNotifications.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notification
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredNotifications.map((notif) => (
                  <tr key={notif.id} className={notif.read ? 'bg-white' : 'bg-blue-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(notif.id)}
                        onChange={() => handleSelectOne(notif.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {notif.icon && (
                          <span className="text-xl">{notif.icon}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${notif.read ? 'text-gray-900' : 'text-blue-900'}`}>
                            {notif.title}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-md">
                            {notif.message}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCategoryBadge(notif.category)}`}>
                        {notif.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityBadge(notif.priority)}`}>
                        {notif.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${notif.read ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>
                        {notif.read ? 'Read' : 'Unread'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(notif.created_at), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => router.push(`/notifications/${notif.id}`)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

