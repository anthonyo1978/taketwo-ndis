"use client"

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface Activity {
  transactionId: string
  residentId: string
  residentName: string
  houseId: string | null
  houseName: string | null
  amount: number
  status: string
  createdAt: string
}

interface RecentActivityFeedProps {
  activities: Activity[]
  isLoading?: boolean
}

const ITEMS_PER_PAGE = 15

export function RecentActivityFeed({ activities, isLoading = false }: RecentActivityFeedProps) {
  const [currentPage, setCurrentPage] = useState(1)
  
  // Reset to page 1 when activities change
  useEffect(() => {
    setCurrentPage(1)
  }, [activities.length])
  
  const totalPages = Math.ceil(activities.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const displayedActivities = activities.slice(startIndex, endIndex)
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }
  
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'draft': 'bg-gray-100 text-gray-700',
      'posted': 'bg-green-100 text-green-700',
      'voided': 'bg-red-100 text-red-700'
    }
    return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-700'
  }
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
      </div>
      
      <div className="divide-y divide-gray-100">
        {displayedActivities.length > 0 ? (
          displayedActivities.map((activity) => (
            <Link
              key={activity.transactionId}
              href={`/transactions?highlight=${activity.transactionId}`}
              className="flex items-center space-x-4 px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-lg">💳</span>
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.residentName}
                  </p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(activity.status)}`}>
                    {activity.status}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  {activity.houseName && (
                    <>
                      <span>{activity.houseName}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
              
              {/* Amount */}
              <div className="flex-shrink-0">
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(activity.amount)}
                </p>
              </div>
            </Link>
          ))
        ) : (
          <div className="px-6 py-12 text-center">
            <div className="text-4xl mb-2">💳</div>
            <p className="text-gray-500">No recent activity</p>
          </div>
        )}
      </div>
      
      {activities.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <Link
              href="/transactions"
              className="text-sm font-medium text-purple-600 hover:text-purple-700"
            >
              View all transactions →
            </Link>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

