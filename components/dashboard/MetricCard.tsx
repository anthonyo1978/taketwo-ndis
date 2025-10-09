"use client"

interface MetricCardProps {
  title: string
  value: string | number
  icon: string
  trend?: number
  subtitle?: string
  isLoading?: boolean
  color?: 'blue' | 'purple' | 'green' | 'orange'
}

export function MetricCard({ 
  title, 
  value, 
  icon, 
  trend, 
  subtitle, 
  isLoading = false,
  color = 'blue'
}: MetricCardProps) {
  
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600'
  }
  
  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600'
    if (trend < 0) return 'text-red-600'
    return 'text-gray-600'
  }
  
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return '↑'
    if (trend < 0) return '↓'
    return '→'
  }
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
      
      <div className="flex items-baseline space-x-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
      
      <div className="flex items-center space-x-2 mt-2">
        {trend !== undefined && (
          <span className={`text-sm font-medium ${getTrendColor(trend)}`}>
            {getTrendIcon(trend)} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {subtitle && (
          <span className="text-sm text-gray-500">{subtitle}</span>
        )}
      </div>
    </div>
  )
}

