"use client"

import { useState } from 'react'
import Link from 'next/link'

interface HousePerformance {
  houseId: string
  houseName: string
  houseAddress: string
  residentCount: number
  activeContracts: number
  totalBalance: number
  transactions30d: number
  revenue30d: number
  occupancyRate: number
}

interface HousePerformanceListProps {
  houses: HousePerformance[]
  isLoading?: boolean
}

export function HousePerformanceList({ houses, isLoading = false }: HousePerformanceListProps) {
  const [expandedHouseId, setExpandedHouseId] = useState<string | null>(null)
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }
  
  const toggleHouse = (houseId: string) => {
    setExpandedHouseId(expandedHouseId === houseId ? null : houseId)
  }
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="p-6 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">House Performance</h3>
        <p className="text-sm text-gray-500 mt-1">Click to expand details</p>
      </div>
      
      <div className="divide-y divide-gray-100">
        {houses.length > 0 ? (
          houses.map((house) => (
            <div key={house.houseId} className="transition-colors">
              {/* House Summary Row */}
              <button
                onClick={() => toggleHouse(house.houseId)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🏠</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900">{house.houseName}</h4>
                    <p className="text-xs text-gray-500 truncate">{house.houseAddress}</p>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">{house.residentCount}</p>
                      <p className="text-xs text-gray-500">Residents</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-purple-600">{formatCurrency(house.revenue30d)}</p>
                      <p className="text-xs text-gray-500">30d Revenue</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-gray-400">
                      {expandedHouseId === house.houseId ? '▼' : '▶'}
                    </span>
                  </div>
                </div>
              </button>
              
              {/* Expanded Details */}
              {expandedHouseId === house.houseId && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Active Residents</p>
                      <p className="text-2xl font-bold text-gray-900">{house.residentCount}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Active Contracts</p>
                      <p className="text-2xl font-bold text-gray-900">{house.activeContracts}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Total Balance</p>
                      <p className="text-2xl font-bold text-purple-600">{formatCurrency(house.totalBalance)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Transactions (30d)</p>
                      <p className="text-2xl font-bold text-gray-900">{house.transactions30d}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center space-x-3">
                    <Link
                      href={`/houses/${house.houseId}`}
                      className="text-sm font-medium text-purple-600 hover:text-purple-700"
                    >
                      View House Details →
                    </Link>
                    <Link
                      href={`/transactions?houseId=${house.houseId}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      View Transactions →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="px-6 py-12 text-center">
            <div className="text-4xl mb-2">🏠</div>
            <p className="text-gray-500">No houses found</p>
          </div>
        )}
      </div>
    </div>
  )
}

