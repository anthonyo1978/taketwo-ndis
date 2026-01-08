"use client"

interface OccupancyBadgeProps {
  occupiedBedrooms: number
  totalBedrooms: number
  size?: 'sm' | 'md' | 'lg'
  showDetails?: boolean
}

export function OccupancyBadge({ 
  occupiedBedrooms, 
  totalBedrooms,
  size = 'md',
  showDetails = true
}: OccupancyBadgeProps) {
  const occupancyRate = totalBedrooms > 0 ? (occupiedBedrooms / totalBedrooms) * 100 : 0
  
  // Determine color based on occupancy rate
  const getColorClasses = () => {
    if (occupancyRate === 100) {
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        icon: 'text-emerald-500',
        border: 'border-emerald-200',
        badge: 'bg-emerald-100 text-emerald-800',
        status: 'Fully Occupied'
      }
    } else if (occupancyRate >= 67) {
      return {
        bg: 'bg-green-50',
        text: 'text-green-700',
        icon: 'text-green-500',
        border: 'border-green-200',
        badge: 'bg-green-100 text-green-800',
        status: 'Well Occupied'
      }
    } else if (occupancyRate >= 34) {
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        icon: 'text-amber-500',
        border: 'border-amber-200',
        badge: 'bg-amber-100 text-amber-800',
        status: 'Partially Occupied'
      }
    } else if (occupancyRate > 0) {
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        icon: 'text-orange-500',
        border: 'border-orange-200',
        badge: 'bg-orange-100 text-orange-800',
        status: 'Low Occupancy'
      }
    } else {
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-700',
        icon: 'text-gray-500',
        border: 'border-gray-200',
        badge: 'bg-gray-100 text-gray-800',
        status: 'Vacant'
      }
    }
  }
  
  const colors = getColorClasses()
  
  // Size variants
  const sizeClasses = {
    sm: {
      container: 'px-2 py-1',
      icon: 'w-3 h-3',
      text: 'text-xs',
      badge: 'text-xs px-1.5 py-0.5'
    },
    md: {
      container: 'px-3 py-2',
      icon: 'w-4 h-4',
      text: 'text-sm',
      badge: 'text-xs px-2 py-1'
    },
    lg: {
      container: 'px-4 py-3',
      icon: 'w-5 h-5',
      text: 'text-base',
      badge: 'text-sm px-3 py-1.5'
    }
  }
  
  const sizes = sizeClasses[size]
  
  if (!showDetails) {
    // Compact version - just the icon and ratio
    return (
      <div 
        className={`inline-flex items-center space-x-1.5 ${sizes.container} rounded-lg ${colors.bg} ${colors.border} border`}
        title={`${occupancyRate.toFixed(0)}% occupied - ${colors.status}`}
      >
        <svg 
          className={`${sizes.icon} ${colors.icon}`} 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
        <span className={`font-semibold ${colors.text} ${sizes.text}`}>
          {occupiedBedrooms}/{totalBedrooms}
        </span>
      </div>
    )
  }
  
  // Full version with percentage and status
  return (
    <div 
      className={`inline-flex items-center space-x-2 ${sizes.container} rounded-lg ${colors.bg} ${colors.border} border`}
    >
      {/* Icon */}
      <svg 
        className={`${sizes.icon} ${colors.icon} flex-shrink-0`} 
        fill="currentColor" 
        viewBox="0 0 24 24"
      >
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
      
      {/* Occupancy ratio */}
      <div className="flex flex-col">
        <span className={`font-bold ${colors.text} ${sizes.text} leading-tight`}>
          {occupiedBedrooms}/{totalBedrooms}
        </span>
        {size !== 'sm' && (
          <span className={`text-xs ${colors.text} opacity-75`}>
            {occupancyRate.toFixed(0)}% full
          </span>
        )}
      </div>
      
      {/* Status badge (for larger sizes) */}
      {size === 'lg' && (
        <span className={`${sizes.badge} font-medium rounded-full ${colors.badge} ml-2`}>
          {colors.status}
        </span>
      )}
    </div>
  )
}

