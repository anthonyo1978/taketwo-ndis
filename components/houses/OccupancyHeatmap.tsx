"use client"

import { useState } from 'react'

interface MonthlyOccupancy {
  month_start: string
  month_name: string
  occupied_bedrooms: number
  total_bedrooms: number
  occupancy_rate: number
}

interface OccupancyHeatmapProps {
  data: MonthlyOccupancy[]
  totalBedrooms: number
}

export function OccupancyHeatmap({ data, totalBedrooms }: OccupancyHeatmapProps) {
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null)
  
  // Get color based on occupancy rate
  const getOccupancyColor = (rate: number) => {
    if (rate === 100) return {
      bg: 'bg-emerald-500',
      text: 'Fully Occupied',
      textColor: 'text-white'
    }
    if (rate >= 80) return {
      bg: 'bg-green-400',
      text: 'Well Occupied',
      textColor: 'text-white'
    }
    if (rate >= 60) return {
      bg: 'bg-lime-400',
      text: 'Good',
      textColor: 'text-gray-900'
    }
    if (rate >= 40) return {
      bg: 'bg-yellow-400',
      text: 'Moderate',
      textColor: 'text-gray-900'
    }
    if (rate >= 20) return {
      bg: 'bg-orange-400',
      text: 'Low',
      textColor: 'text-white'
    }
    if (rate > 0) return {
      bg: 'bg-red-400',
      text: 'Very Low',
      textColor: 'text-white'
    }
    return {
      bg: 'bg-gray-200',
      text: 'Vacant',
      textColor: 'text-gray-700'
    }
  }
  
  // Calculate average occupancy
  const avgOccupancy = data.length > 0 
    ? data.reduce((sum, month) => sum + month.occupancy_rate, 0) / data.length
    : 0
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            12-Month Occupancy Trend
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Historical occupancy rates for the past year
          </p>
        </div>
        
        {/* Average occupancy indicator */}
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {avgOccupancy.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            Avg Occupancy
          </div>
        </div>
      </div>
      
      {/* Heatmap Grid */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        {data.map((month) => {
          const color = getOccupancyColor(month.occupancy_rate)
          const isHovered = hoveredMonth === month.month_start
          
          return (
            <div
              key={month.month_start}
              className="relative group"
              onMouseEnter={() => setHoveredMonth(month.month_start)}
              onMouseLeave={() => setHoveredMonth(null)}
            >
              {/* Month card */}
              <div 
                className={`
                  ${color.bg} ${color.textColor}
                  rounded-lg p-4 transition-all duration-200 cursor-pointer
                  ${isHovered ? 'ring-4 ring-blue-400 ring-opacity-50 transform scale-105' : ''}
                  hover:shadow-lg
                `}
              >
                {/* Month name */}
                <div className="text-xs font-medium mb-2 opacity-90">
                  {month.month_name.split(' ')[0]}
                </div>
                
                {/* Occupancy */}
                <div className="flex flex-col">
                  <div className="text-2xl font-bold leading-none">
                    {month.occupied_bedrooms}
                  </div>
                  <div className="text-xs opacity-75 mt-1">
                    of {month.total_bedrooms}
                  </div>
                </div>
                
                {/* Percentage */}
                <div className="text-sm font-semibold mt-2">
                  {month.occupancy_rate.toFixed(0)}%
                </div>
              </div>
              
              {/* Tooltip on hover */}
              {isHovered && (
                <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap">
                  <div className="font-semibold">{month.month_name}</div>
                  <div className="mt-1">{color.text}</div>
                  <div className="mt-1">
                    {month.occupied_bedrooms} / {month.total_bedrooms} bedrooms occupied
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Legend */}
      <div className="border-t border-gray-200 pt-4">
        <div className="text-xs font-medium text-gray-700 mb-3">Occupancy Rate Legend</div>
        <div className="flex flex-wrap gap-3">
          {[
            { label: '100%', color: 'bg-emerald-500', textColor: 'text-white' },
            { label: '80-99%', color: 'bg-green-400', textColor: 'text-white' },
            { label: '60-79%', color: 'bg-lime-400', textColor: 'text-gray-900' },
            { label: '40-59%', color: 'bg-yellow-400', textColor: 'text-gray-900' },
            { label: '20-39%', color: 'bg-orange-400', textColor: 'text-white' },
            { label: '1-19%', color: 'bg-red-400', textColor: 'text-white' },
            { label: '0%', color: 'bg-gray-200', textColor: 'text-gray-700' }
          ].map((item) => (
            <div key={item.label} className="flex items-center space-x-2">
              <div className={`w-6 h-6 rounded ${item.color} ${item.textColor} flex items-center justify-center text-xs font-bold`}>
                {item.label === '100%' ? '✓' : ''}
              </div>
              <span className="text-xs text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Insights */}
      {data.length > 0 && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-900">Occupancy Insights</div>
              <div className="text-xs text-blue-700 mt-1">
                {avgOccupancy >= 80 
                  ? `Excellent performance! Average occupancy of ${avgOccupancy.toFixed(0)}% over 12 months.`
                  : avgOccupancy >= 60
                  ? `Good performance with ${avgOccupancy.toFixed(0)}% average occupancy. Consider strategies to reach 80%+.`
                  : `Room for improvement. Average occupancy of ${avgOccupancy.toFixed(0)}%. Focus on filling vacant bedrooms.`
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

