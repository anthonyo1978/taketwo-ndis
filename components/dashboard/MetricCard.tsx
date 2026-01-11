"use client"

interface MetricCardProps {
  title: string
  value: string | number
  icon: string
  trend?: number
  subtitle?: string
  isLoading?: boolean
  color?: 'blue' | 'purple' | 'green' | 'orange'
  compact?: boolean
  onClick?: () => void
}

export function MetricCard({ 
  title, 
  value, 
  icon, 
  trend, 
  subtitle, 
  isLoading = false,
  color = 'blue',
  compact = false,
  onClick
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
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${compact ? 'p-4' : 'p-6'}`}>
        <div className="animate-pulse">
          <div className={`flex items-center justify-between ${compact ? 'mb-3' : 'mb-4'}`}>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} bg-gray-200 rounded-lg`}></div>
          </div>
          <div className={`${compact ? 'h-7' : 'h-8'} bg-gray-200 rounded w-32 mb-2`}></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    )
  }
  
  return (
    <div 
      onClick={onClick}
      className={`
        bg-white rounded-xl border border-gray-200 shadow-sm 
        transition-all duration-200
        ${compact ? 'p-4' : 'p-6'}
        ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-105 hover:-translate-y-1 active:scale-100' : 'hover:shadow-md'}
      `}
    >
      <div className={`flex items-center justify-between ${compact ? 'mb-3' : 'mb-4'}`}>
        <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-600`}>{title}</p>
        <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <span className={compact ? 'text-xl' : 'text-2xl'}>{icon}</span>
        </div>
      </div>
      
      <div className="flex items-baseline space-x-2">
        <p className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900`}>{value}</p>
      </div>
      
      <div className={`flex items-center space-x-2 ${compact ? 'mt-1' : 'mt-2'}`}>
        {trend !== undefined && (
          <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium ${getTrendColor(trend)}`}>
            {getTrendIcon(trend)} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {subtitle && (
          <span className={`${compact ? 'text-xs' : 'text-sm'} text-gray-500`}>{subtitle}</span>
        )}
      </div>
    </div>
  )
}

