"use client"

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface TrendData {
  [key: string]: any
  year: number
  transactionCount: number
  totalAmount: number
}

interface TransactionTrendsChartProps {
  data: {
    monthly?: TrendData[]
    daily?: TrendData[]
    weekly?: TrendData[]
  }
  isLoading?: boolean
}

type TimePeriod = '7d' | '30d' | '6m' | '12m'

export function TransactionTrendsChart({ data, isLoading = false }: TransactionTrendsChartProps) {
  const [period, setPeriod] = useState<TimePeriod>('7d')
  
  // Get data based on selected period
  const getFilteredData = () => {
    switch (period) {
      case '7d':
        // Show daily data for last 7 days
        return (data.daily || []).slice(-7)
      case '30d':
        // Show weekly data for last 30 days (4-5 weeks)
        return (data.weekly || []).slice(-5)
      case '6m':
        // Show monthly data for last 6 months
        return (data.monthly || []).slice(-6)
      case '12m':
        // Show monthly data for last 12 months
        return (data.monthly || []).slice(-12)
      default:
        return (data.monthly || []).slice(-1)
    }
  }
  
  const filteredData = getFilteredData()
  
  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const label = payload[0].payload.date || payload[0].payload.week || payload[0].payload.month
      const year = payload[0].payload.year
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-1">
            {label} {year}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">{payload[0].payload.transactionCount}</span> transactions
          </p>
          <p className="text-sm font-medium text-purple-600">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      )
    }
    return null
  }
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      {/* Header with Period Toggle */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Transaction Trends</h3>
        
        <div className="flex items-center space-x-2">
          {(['7d', '30d', '6m', '12m'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                period === p
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p === '6m' ? '6 months' : p === '12m' ? '12 months' : p}
            </button>
          ))}
        </div>
      </div>
      
      {/* Chart */}
      {filteredData.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey={period === '7d' ? 'date' : period === '30d' ? 'week' : 'month'} 
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={{ stroke: '#d1d5db' }}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={period === '7d' ? 'preserveStartEnd' : 'preserveStartEnd'}
              width={80}
            />
            <YAxis 
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={{ stroke: '#d1d5db' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="totalAmount" 
              fill="#8b5cf6" 
              radius={[8, 8, 0, 0]}
              maxBarSize={60}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-lg mb-2">📊</p>
            <p>No transaction data available</p>
          </div>
        </div>
      )}
    </div>
  )
}

