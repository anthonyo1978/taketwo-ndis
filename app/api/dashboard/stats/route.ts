import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { getCurrentUserOrganizationId } from 'lib/utils/organization'

export interface DashboardStats {
  portfolio: {
    totalHouses: number
    totalResidents: number
    totalContracts: number
    totalBalance: number
  }
  claims: {
    totalPaidAmount: number
    totalPaidTransactions: number
  }
  transactions: {
    period7d: { count: number; amount: number; trend: number }
    period30d: { count: number; amount: number; trend: number }
    period12m: { count: number; amount: number; trend: number }
  }
  monthlyTrends: Array<{
    month: string
    year: number
    transactionCount: number
    totalAmount: number
  }>
  dailyTrends: Array<{
    date: string
    year: number
    transactionCount: number
    totalAmount: number
  }>
  weeklyTrends: Array<{
    week: string
    year: number
    transactionCount: number
    totalAmount: number
  }>
  recentActivity: Array<{
    transactionId: string
    residentId: string
    residentName: string
    houseId: string | null
    houseName: string | null
    amount: number
    status: string
    createdAt: string
  }>
  housePerformance: Array<{
    houseId: string
    houseName: string
    houseAddress: string
    residentCount: number
    activeContracts: number
    totalBalance: number
    transactions30d: number
    revenue30d: number
    occupancyRate: number
  }>
}

/**
 * GET /api/dashboard/stats
 * 
 * Returns aggregated dashboard metrics using Supabase RPC functions
 */
export async function GET(request: NextRequest) {
  try {
    // Get organization context
    const organizationId = await getCurrentUserOrganizationId()
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'User organization not found' },
        { status: 401 }
      )
    }
    
    const supabase = await createClient()
    
    console.log('[Dashboard API] Fetching portfolio metrics...')
    
    // 1. Get portfolio overview
    const { data: portfolioData, error: portfolioError } = await supabase
      .rpc('get_portfolio_metrics', { org_id: organizationId })
    
    if (portfolioError) {
      console.error('[Dashboard API] Portfolio metrics error:', portfolioError)
      throw new Error('Failed to fetch portfolio metrics')
    }
    
    console.log('[Dashboard API] Fetching transaction metrics...')
    
    // 2. Get claims metrics (total paid amount and count)
    const { data: claimsData, error: claimsError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('status', 'paid')
    
    if (claimsError) {
      console.error('[Dashboard API] Claims metrics error:', claimsError)
      throw new Error('Failed to fetch claims metrics')
    }
    
    const totalPaidAmount = (claimsData || []).reduce((sum, tx) => sum + Number(tx.amount), 0)
    const totalPaidTransactions = claimsData?.length || 0
    
    console.log('[Dashboard API] Fetching transaction metrics...')
    
    // 3. Get transaction metrics for different periods
    const [metrics7d, metrics30d, metrics12m] = await Promise.all([
      supabase.rpc('get_transaction_metrics', { org_id: organizationId, days_back: 7 }),
      supabase.rpc('get_transaction_metrics', { org_id: organizationId, days_back: 30 }),
      supabase.rpc('get_transaction_metrics', { org_id: organizationId, days_back: 365 })
    ])
    
    if (metrics7d.error || metrics30d.error || metrics12m.error) {
      console.error('[Dashboard API] Transaction metrics error')
      throw new Error('Failed to fetch transaction metrics')
    }
    
    // Calculate trends (% change vs previous period)
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }
    
    console.log('[Dashboard API] Fetching monthly trends...')
    
    // 4. Get monthly trends
    const { data: monthlyTrends, error: trendsError } = await supabase
      .rpc('get_monthly_transaction_trends', { org_id: organizationId, months_back: 6 })
    
    if (trendsError) {
      console.error('[Dashboard API] Monthly trends error:', trendsError)
      throw new Error('Failed to fetch monthly trends')
    }
    
    console.log('[Dashboard API] Fetching daily trends...')
    
    // 4b. Get daily trends
    const { data: dailyTrends, error: dailyTrendsError } = await supabase
      .rpc('get_daily_transaction_trends', { org_id: organizationId, days_back: 30 })
    
    if (dailyTrendsError) {
      console.error('[Dashboard API] Daily trends error:', dailyTrendsError)
      throw new Error('Failed to fetch daily trends')
    }
    
    console.log('[Dashboard API] Fetching weekly trends...')
    
    // 4c. Get weekly trends
    const { data: weeklyTrends, error: weeklyTrendsError } = await supabase
      .rpc('get_weekly_transaction_trends', { org_id: organizationId, weeks_back: 8 })
    
    if (weeklyTrendsError) {
      console.error('[Dashboard API] Weekly trends error:', weeklyTrendsError)
      throw new Error('Failed to fetch weekly trends')
    }
    
    console.log('[Dashboard API] Fetching recent activity...')
    
    // 5. Get recent activity
    const { data: recentActivity, error: activityError } = await supabase
      .rpc('get_recent_activity', { org_id: organizationId, limit_count: 10 })
    
    if (activityError) {
      console.error('[Dashboard API] Recent activity error:', activityError)
      throw new Error('Failed to fetch recent activity')
    }
    
    console.log('[Dashboard API] Fetching house performance...')
    
    // 6. Get house performance
    const { data: housePerformance, error: houseError } = await supabase
      .rpc('get_house_performance', { org_id: organizationId })
    
    if (houseError) {
      console.error('[Dashboard API] House performance error:', houseError)
      throw new Error('Failed to fetch house performance')
    }
    
    console.log('[Dashboard API] All data fetched successfully')
    
    // 7. Build response
    const stats: DashboardStats = {
      portfolio: portfolioData || { totalHouses: 0, totalResidents: 0, totalContracts: 0, totalBalance: 0 },
      claims: {
        totalPaidAmount,
        totalPaidTransactions
      },
      transactions: {
        period7d: {
          count: metrics7d.data?.currentPeriod?.count || 0,
          amount: metrics7d.data?.currentPeriod?.amount || 0,
          trend: calculateTrend(
            metrics7d.data?.currentPeriod?.amount || 0,
            metrics7d.data?.previousPeriod?.amount || 0
          )
        },
        period30d: {
          count: metrics30d.data?.currentPeriod?.count || 0,
          amount: metrics30d.data?.currentPeriod?.amount || 0,
          trend: calculateTrend(
            metrics30d.data?.currentPeriod?.amount || 0,
            metrics30d.data?.previousPeriod?.amount || 0
          )
        },
        period12m: {
          count: metrics12m.data?.currentPeriod?.count || 0,
          amount: metrics12m.data?.currentPeriod?.amount || 0,
          trend: calculateTrend(
            metrics12m.data?.currentPeriod?.amount || 0,
            metrics12m.data?.previousPeriod?.amount || 0
          )
        }
      },
      monthlyTrends: (monthlyTrends || []).map((trend: any) => ({
        month: trend.month,
        year: trend.year,
        transactionCount: Number(trend.transaction_count),
        totalAmount: Number(trend.total_amount)
      })),
      dailyTrends: (dailyTrends || []).map((trend: any) => ({
        date: trend.date,
        year: trend.year,
        transactionCount: Number(trend.transaction_count),
        totalAmount: Number(trend.total_amount)
      })),
      weeklyTrends: (weeklyTrends || []).map((trend: any) => ({
        week: trend.week,
        year: trend.year,
        transactionCount: Number(trend.transaction_count),
        totalAmount: Number(trend.total_amount)
      })),
      recentActivity: (recentActivity || []).map((activity: any) => ({
        transactionId: activity.transaction_id,
        residentId: activity.resident_id,
        residentName: activity.resident_name,
        houseId: activity.house_id,
        houseName: activity.house_name,
        amount: Number(activity.amount),
        status: activity.status,
        createdAt: activity.created_at
      })),
      housePerformance: (housePerformance || []).map((house: any) => ({
        houseId: house.house_id,
        houseName: house.house_name,
        houseAddress: house.house_address,
        residentCount: Number(house.resident_count),
        activeContracts: Number(house.active_contracts),
        totalBalance: Number(house.total_balance),
        transactions30d: Number(house.transactions_30d),
        revenue30d: Number(house.revenue_30d),
        occupancyRate: Number(house.occupancy_rate)
      }))
    }
    
    return NextResponse.json({
      success: true,
      data: stats
    })
    
  } catch (error) {
    console.error('[Dashboard API] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats' 
      },
      { status: 500 }
    )
  }
}

