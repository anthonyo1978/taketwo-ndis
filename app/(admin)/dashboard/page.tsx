"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MetricCard } from 'components/dashboard/MetricCard'
import { RecentActivityFeed } from 'components/dashboard/RecentActivityFeed'
import { HousePerformanceList } from 'components/dashboard/HousePerformanceList'
import { SystemStatusBadges } from 'components/dashboard/SystemStatusBadges'
import { FinancialSummaryCards } from 'components/dashboard/FinancialSummaryCards'
import { PortfolioFinancialChart } from 'components/dashboard/PortfolioFinancialChart'
import { HouseFinancialHealth } from 'components/dashboard/HouseFinancialHealth'
import type { DashboardStats } from 'app/api/dashboard/stats/route'

type DashboardView = 'portfolio' | 'ndis'

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [organizationName, setOrganizationName] = useState<string>('Haven')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<DashboardView>('portfolio')
  
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
      const result = await response.json() as {
        success: boolean
        data?: {
          organizationName?: string
        }
      }
      
      if (result.success && result.data?.organizationName) {
        setOrganizationName(result.data.organizationName)
      }
    } catch (err) {
      console.error('Failed to fetch organization name:', err)
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
    <div className="p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {organizationName} Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Portfolio overview and financial health
            </p>
          </div>
          <SystemStatusBadges className="mt-1" />
        </div>

        {/* ── View Toggle ── */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          <button
            onClick={() => setView('portfolio')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              view === 'portfolio'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            💰 Financial Overview
          </button>
          <button
            onClick={() => setView('ndis')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              view === 'ndis'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            📋 NDIS & Operations
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ── PORTFOLIO / FINANCIAL VIEW ── */}
        {/* ═══════════════════════════════════════════════════════ */}
        {view === 'portfolio' && (
          <div className="space-y-6">
            {/* Financial KPI Cards */}
            <FinancialSummaryCards />

            {/* Income vs Expenses Chart */}
            <PortfolioFinancialChart />

            {/* Two-column: House Health + Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HouseFinancialHealth />
              <RecentActivityFeed
                activities={stats?.recentActivity || []}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ── NDIS & OPERATIONS VIEW ── */}
        {/* ═══════════════════════════════════════════════════════ */}
        {view === 'ndis' && (
          <div className="space-y-6">
            {/* Portfolio Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <MetricCard
                title="Total Houses"
                value={stats?.portfolio.totalHouses || 0}
                icon="🏠"
                subtitle="Active properties"
                color="blue"
                isLoading={isLoading}
                compact
                onClick={() => router.push('/houses')}
              />
              <MetricCard
                title="Active Residents"
                value={stats?.portfolio.totalResidents || 0}
                icon="👥"
                subtitle="Active Residents"
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
                subtitle="Remaining funds"
                color="orange"
                isLoading={isLoading}
                compact
              />
              <MetricCard
                title="Outstanding Claims"
                value={stats ? formatCurrency(stats.claims.totalOutstandingAmount) : '$0'}
                icon="⏳"
                subtitle={`${stats?.claims.totalOutstandingTransactions || 0} pending`}
                color="orange"
                isLoading={isLoading}
                compact
              />
              <MetricCard
                title="Claims Paid"
                value={stats ? formatCurrency(stats.claims.totalPaidAmount) : '$0'}
                icon="✅"
                subtitle={`${stats?.claims.totalPaidTransactions || 0} transactions`}
                color="green"
                isLoading={isLoading}
                compact
              />
            </div>
            
            {/* Transaction Volume Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <RecentActivityFeed
                activities={stats?.recentActivity || []}
                isLoading={isLoading}
              />
              <HousePerformanceList
                houses={stats?.housePerformance || []}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
