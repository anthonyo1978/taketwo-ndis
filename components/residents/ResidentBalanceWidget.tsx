"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "components/Button/Button"
import type { ResidentBalanceSummary } from "types/transaction"
import type { FundingInformation } from "types/resident"

interface ResidentBalanceWidgetProps {
  residentId: string
  onCreateTransaction?: () => void
}

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)

const fmtCurrencyFull = (v: number) =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)

export function ResidentBalanceWidget({ residentId, onCreateTransaction }: ResidentBalanceWidgetProps) {
  const [balanceSummary, setBalanceSummary] = useState<ResidentBalanceSummary | null>(null)
  const [fundingContracts, setFundingContracts] = useState<FundingInformation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        const fundingResponse = await fetch(`/api/residents/${residentId}/funding`)
        const fundingResult = await fundingResponse.json() as { success: boolean; data?: FundingInformation[] }
        
        if (fundingResult.success && fundingResult.data) {
          setFundingContracts(fundingResult.data)
          
          const totalAllocated = fundingResult.data.reduce((sum: number, contract: FundingInformation) => 
            sum + (contract.originalAmount || contract.amount || 0), 0)
          const totalRemaining = fundingResult.data.reduce((sum: number, contract: FundingInformation) => 
            sum + (contract.currentBalance || contract.amount || 0), 0)
          const totalSpent = totalAllocated - totalRemaining
          
          const activeContracts = fundingResult.data
            .filter((contract: FundingInformation) => contract.contractStatus === 'Active')
            .map((contract: FundingInformation) => ({
              contractId: contract.id,
              type: contract.type,
              originalAmount: contract.originalAmount || contract.amount || 0,
              currentBalance: contract.currentBalance || contract.amount || 0,
              recentTransactionCount: 0
            }))
          
          setBalanceSummary({
            residentId,
            activeContracts,
            totalAllocated,
            totalRemaining,
            totalSpent
          })
        } else {
          setBalanceSummary({
            residentId,
            activeContracts: [],
            totalAllocated: 0,
            totalRemaining: 0,
            totalSpent: 0
          })
        }
      } catch (error) {
        console.error('Error loading resident financial data:', error)
        setBalanceSummary({
          residentId,
          activeContracts: [],
          totalAllocated: 0,
          totalRemaining: 0,
          totalSpent: 0
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [residentId])


  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    )
  }

  if (!balanceSummary) {
    return null
  }

  const { totalAllocated, totalRemaining, totalSpent } = balanceSummary
  const usedPct = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0

  return (
    <div className="bg-white rounded-lg border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-gray-900">Contract Balances</h3>
        {onCreateTransaction && (
          <Button
            onClick={onCreateTransaction}
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-700 text-xs px-3 py-1.5"
          >
            + New Transaction
          </Button>
        )}
      </div>

      {balanceSummary.activeContracts.length > 0 ? (
        <>
          {/* Summary row */}
          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Allocated</span>
              <span className="text-sm font-semibold text-gray-900">{fmtCurrency(totalAllocated)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Spent</span>
              <span className="text-sm font-semibold text-orange-600">{fmtCurrency(totalSpent)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Remaining</span>
              <span className="text-sm font-bold text-blue-600">{fmtCurrency(totalRemaining)}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">{usedPct}% used</span>
              <span className="text-xs text-gray-400">{100 - usedPct}% remaining</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usedPct > 90 ? 'bg-red-500' : usedPct > 70 ? 'bg-orange-400' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(usedPct, 100)}%` }}
              />
            </div>
          </div>

          {/* Active contracts */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Active Contracts</h4>
            <div className="space-y-2">
              {balanceSummary.activeContracts.map(contract => (
                <div key={contract.contractId} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{contract.type}</p>
                    <p className="text-xs text-gray-400">of {fmtCurrency(contract.originalAmount)}</p>
                  </div>
                  <span className="text-sm font-semibold text-blue-600 ml-3 flex-shrink-0">
                    {fmtCurrencyFull(contract.currentBalance)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-6">
          <svg className="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          <p className="text-sm font-medium text-gray-700 mb-1">No Active Contracts</p>
          <p className="text-xs text-gray-500 mb-3">No active funding contracts found.</p>
          <Link
            href={`/residents/${residentId}`}
            className="inline-flex items-center px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Manage Funding
          </Link>
        </div>
      )}
    </div>
  )
}
