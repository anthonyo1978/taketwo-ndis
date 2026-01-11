"use client"

import { Bell, Clock, FileText, Home, UserCheck, AlertCircle } from 'lucide-react'

/**
 * RemindersPanel - Contextual reminders for SDA compliance and property management
 * 
 * Presentation layer only (MVP) - No backend integration yet
 * Future: Will integrate with automation and compliance workflows
 */
export function RemindersPanel() {
  // Mock reminder data for MVP
  const mockReminders = [
    {
      id: '1',
      type: 'property-inspection',
      title: 'Property Inspection Due',
      description: 'Victor Harbour - Quarterly safety check',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      priority: 'high',
      category: 'Property Compliance',
      icon: Home,
    },
    {
      id: '2',
      type: 'resident-review',
      title: 'Resident Plan Review',
      description: 'John Smith - Annual support plan review',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      priority: 'medium',
      category: 'Resident Care',
      icon: UserCheck,
    },
    {
      id: '3',
      type: 'funding-expiry',
      title: 'Funding Contract Expiring',
      description: 'Sarah Johnson - NDIS funding renewal required',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      priority: 'high',
      category: 'Funding',
      icon: FileText,
    },
    {
      id: '4',
      type: 'maintenance-schedule',
      title: 'Scheduled Maintenance',
      description: 'Adelaide Hills - HVAC service',
      dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
      priority: 'low',
      category: 'Maintenance',
      icon: AlertCircle,
    },
  ]

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDueDate = (date: Date) => {
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Due tomorrow'
    if (diffDays < 7) return `Due in ${diffDays} days`
    if (diffDays < 30) return `Due in ${Math.ceil(diffDays / 7)} weeks`
    return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="flex gap-2">
          <Bell className="size-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-blue-900">Contextual Reminders</p>
            <p className="text-xs text-blue-700 mt-1">
              Smart reminders for SDA compliance, property checks, and key deadlines.
            </p>
          </div>
        </div>
      </div>

      {/* Reminders List */}
      {mockReminders.map((reminder) => {
        const Icon = reminder.icon
        return (
          <div
            key={reminder.id}
            className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex gap-3">
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${getPriorityColor(reminder.priority)} flex items-center justify-center`}>
                <Icon className="size-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {reminder.title}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border capitalize ${getPriorityColor(reminder.priority)}`}>
                    {reminder.priority}
                  </span>
                </div>
                
                <p className="text-xs text-gray-600 mb-2">
                  {reminder.description}
                </p>
                
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatDueDate(reminder.dueDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="size-3" />
                    {reminder.category}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

