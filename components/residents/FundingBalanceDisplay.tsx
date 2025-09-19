'use client'

import { useMemo } from 'react'
import type { FundingInformation } from 'types/resident'
import { calculateBalanceSummary, getDrawdownPercentage, needsRenewal } from 'lib/utils/funding-calculations'

interface FundingBalanceDisplayProps {
  contracts: FundingInformation[]
  showDetails?: boolean
  className?: string
}

export function FundingBalanceDisplay({ 
  contracts, 
  showDetails = true,
  className = '' 
}: FundingBalanceDisplayProps) {
  const balanceSummary = useMemo(() => calculateBalanceSummary(contracts), [contracts])

  const ContractBalanceCard = ({ contract }: { contract: FundingInformation }) => {
    const drawdownPercentage = getDrawdownPercentage(contract)
    const needsRenewalFlag = needsRenewal(contract)
    
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'Active':
          return 'bg-green-100 text-green-800 border-green-200'
        case 'Draft':
          return 'bg-gray-100 text-gray-800 border-gray-200'
        case 'Expired':
          return 'bg-red-100 text-red-800 border-red-200'
        case 'Cancelled':
          return 'bg-gray-100 text-gray-800 border-gray-200'
        case 'Renewed':
          return 'bg-blue-100 text-blue-800 border-blue-200'
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200'
      }
    }

    return (
      <div className={`bg-white rounded-lg border p-4 ${needsRenewalFlag ? 'border-orange-200 bg-orange-50' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(contract.contractStatus)}`}>
              {contract.contractStatus}
            </span>
            {needsRenewalFlag && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                Needs Renewal
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {contract.type}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="text-sm text-gray-600">Original Amount</div>
            <div className="text-lg font-semibold">${contract.originalAmount.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Current Balance</div>
            <div className="text-lg font-semibold text-blue-600">${contract.currentBalance.toLocaleString()}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Drawdown Progress</span>
            <span>{drawdownPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${drawdownPercentage}%` }}
            />
          </div>
        </div>

        {/* Contract Details */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>Rate: {contract.drawdownRate} • Auto: {contract.autoDrawdown ? 'Yes' : 'No'}</div>
          <div>
            {new Date(contract.startDate).toLocaleDateString('en-AU')} - {' '}
            {contract.endDate ? new Date(contract.endDate).toLocaleDateString('en-AU') : 'Ongoing'}
          </div>
        </div>
      </div>
    )
  }

  if (contracts.length === 0) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 text-center ${className}`}>
        <div className="text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Funding Contracts</h3>
          <p className="mt-1 text-sm text-gray-500">Add funding contracts to track balances and drawdowns.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Balance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Balance */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-blue-800">
                ${balanceSummary.totalCurrent.toLocaleString()}
              </div>
              <div className="text-sm text-blue-600">Current Balance</div>
            </div>
          </div>
        </div>

        {/* Original Allocation */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-green-800">
                ${balanceSummary.totalOriginal.toLocaleString()}
              </div>
              <div className="text-sm text-green-600">Original Allocation</div>
            </div>
          </div>
        </div>

        {/* Total Drawn Down */}
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-orange-800">
                ${balanceSummary.totalDrawnDown.toLocaleString()}
              </div>
              <div className="text-sm text-orange-600">Total Drawn Down</div>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Summary Stats */}
      <div className="bg-white rounded-lg border p-4">
        <h4 className="text-lg font-semibold mb-3">Contract Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{balanceSummary.activeContracts}</div>
            <div className="text-sm text-gray-600">Active Contracts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{balanceSummary.expiringSoon}</div>
            <div className="text-sm text-gray-600">Expiring Soon</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{contracts.length}</div>
            <div className="text-sm text-gray-600">Total Contracts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {balanceSummary.totalOriginal > 0 
                ? ((balanceSummary.totalCurrent / balanceSummary.totalOriginal) * 100).toFixed(1)
                : 0}%
            </div>
            <div className="text-sm text-gray-600">Remaining</div>
          </div>
        </div>
      </div>

      {/* Individual Contract Details */}
      {showDetails && (
        <div>
          <h4 className="text-lg font-semibold mb-3">Contract Details</h4>
          <div className="space-y-4">
            {contracts
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map(contract => (
                <ContractBalanceCard key={contract.id} contract={contract} />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}