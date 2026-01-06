"use client"

import { useEffect, useState } from 'react'
import { Metadata } from 'next'
import { MetricCard } from 'components/dashboard/MetricCard'
import { RecentActivityFeed } from 'components/dashboard/RecentActivityFeed'
import { HousePerformanceList } from 'components/dashboard/HousePerformanceList'
import { SystemStatusBadges } from 'components/dashboard/SystemStatusBadges'
import type { DashboardStats } from 'app/api/dashboard/stats/route'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [organizationName, setOrganizationName] = useState<string>('Haven')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    fetchDashboardStats()
    fetchOrganizationName()
  }, [])
  
  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/dashboard/stats')
      const result = await response.json() as {
        success: boolean
        data?: DashboardStats
        error?: string
      }
      
      if (result.success && result.data) {
        setStats(result.data)
      } else {
        setError(result.error || 'Failed to load dashboard')
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError('Failed to load dashboard')
    } finally {
      setIsLoading(false)
    }
  }
  
  const fetchOrganizationName = async () => {
    try {
      const response = await fetch('/api/organization/settings')
      const result = await response.json()
      
      if (result.success && result.data?.organizationName) {
        setOrganizationName(result.data.organizationName)
      }
    } catch (err) {
      console.error('Failed to fetch organization name:', err)
      // Silently fail - use default "Haven"
    }
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }
  
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-AU').format(num)
  }
  
  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={fetchDashboardStats}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with System Status */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome to your {organizationName} Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Here's your portfolio overview
            </p>
          </div>
          
          {/* System Status Indicators */}
          <SystemStatusBadges className="mt-1" />
        </div>
        
        {/* Portfolio Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <MetricCard
            title="Total Houses"
            value={stats?.portfolio.totalHouses || 0}
            icon="🏠"
            subtitle="Active properties"
            color="blue"
            isLoading={isLoading}
            compact
          />
          <MetricCard
            title="Total Residents"
            value={stats?.portfolio.totalResidents || 0}
            icon="👥"
            subtitle="Active participants"
            color="purple"
            isLoading={isLoading}
            compact
          />
          <MetricCard
            title="Active Contracts"
            value={stats?.portfolio.totalContracts || 0}
            icon="📋"
            subtitle="Funding agreements"
            color="green"
            isLoading={isLoading}
            compact
          />
          <MetricCard
            title="Available Funding"
            value={stats ? formatCurrency(stats.portfolio.totalBalance) : '$0'}
            icon="💰"
            subtitle="Remaining funds (active contracts)"
            color="orange"
            isLoading={isLoading}
            compact
          />
          <MetricCard
            title="Outstanding Claims"
            value={stats ? formatCurrency(stats.claims.totalOutstandingAmount) : '$0'}
            icon="⏳"
            subtitle={`${stats?.claims.totalOutstandingTransactions || 0} transactions pending`}
            color="orange"
            isLoading={isLoading}
            compact
          />
          <MetricCard
            title="Claims Paid"
            value={stats ? formatCurrency(stats.claims.totalPaidAmount) : '$0'}
            icon="✅"
            subtitle={`representing ${stats?.claims.totalPaidTransactions || 0} transactions`}
            color="green"
            isLoading={isLoading}
            compact
          />
        </div>
        
        {/* Transaction Volume Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Last 7 Days"
            value={stats ? formatCurrency(stats.transactions.period7d.amount) : '$0'}
            icon="📊"
            trend={stats?.transactions.period7d.trend}
            subtitle={stats ? `${stats.transactions.period7d.count} transactions` : '0 transactions'}
            color="purple"
            isLoading={isLoading}
          />
          <MetricCard
            title="Last 30 Days"
            value={stats ? formatCurrency(stats.transactions.period30d.amount) : '$0'}
            icon="📈"
            trend={stats?.transactions.period30d.trend}
            subtitle={stats ? `${stats.transactions.period30d.count} transactions` : '0 transactions'}
            color="purple"
            isLoading={isLoading}
          />
          <MetricCard
            title="Last 12 Months"
            value={stats ? formatCurrency(stats.transactions.period12m.amount) : '$0'}
            icon="📉"
            trend={stats?.transactions.period12m.trend}
            subtitle={stats ? `${stats.transactions.period12m.count} transactions` : '0 transactions'}
            color="purple"
            isLoading={isLoading}
          />
        </div>
        
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <RecentActivityFeed
            activities={stats?.recentActivity || []}
            isLoading={isLoading}
          />
          
          {/* House Performance */}
          <HousePerformanceList
            houses={stats?.housePerformance || []}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}
