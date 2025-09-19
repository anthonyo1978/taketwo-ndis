'use client'

import { useState } from 'react'
import type { FundingInformation, ContractStatus } from '@/types/resident'
import { Button } from 'components/Button/Button'

interface ContractStatusManagerProps {
  contract: FundingInformation
  onContractChange?: (contract: FundingInformation) => void
  onActivate?: (contractId: string) => Promise<void>
  onRenew?: (contractId: string) => Promise<void>
  disabled?: boolean
}

// Contract status transitions following business rules
const contractStatusTransitions: Record<ContractStatus, ContractStatus[]> = {
  'Draft': ['Active', 'Cancelled'],
  'Active': ['Expired', 'Cancelled'],
  'Expired': ['Renewed', 'Cancelled'],
  'Cancelled': [], // Terminal state
  'Renewed': ['Active'] // New contract created
}

// Status badge colors and styling
const statusBadgeClasses = {
  'Draft': 'bg-gray-100 text-gray-800 border-gray-200',
  'Active': 'bg-green-100 text-green-800 border-green-200',
  'Expired': 'bg-red-100 text-red-800 border-red-200',
  'Cancelled': 'bg-gray-100 text-gray-800 border-gray-200',
  'Renewed': 'bg-blue-100 text-blue-800 border-blue-200'
}

// Action button labels
const statusTransitionLabels: Record<ContractStatus, string> = {
  'Draft': 'Activate Contract',
  'Active': 'Mark as Expired',
  'Expired': 'Renew Contract',
  'Cancelled': 'Contract Cancelled',
  'Renewed': 'Activate Renewal'
}

export function ContractStatusManager({ 
  contract, 
  onContractChange, 
  onActivate,
  onRenew,
  disabled = false 
}: ContractStatusManagerProps) {
  const [isChanging, setIsChanging] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState<ContractStatus | null>(null)

  const validTransitions = contractStatusTransitions[contract.contractStatus] || []

  const handleStatusChange = async (newStatus: ContractStatus) => {
    setIsChanging(true)
    
    try {
      if (newStatus === 'Active' && onActivate) {
        await onActivate(contract.id)
      } else if (newStatus === 'Renewed' && onRenew) {
        await onRenew(contract.id)
      }
      
      // Create updated contract object
      const updatedContract: FundingInformation = {
        ...contract,
        contractStatus: newStatus,
        updatedAt: new Date()
      }
      
      onContractChange?.(updatedContract)
    } catch (error) {
      console.error('Failed to update contract status:', error)
      // TODO: Show error toast
    } finally {
      setIsChanging(false)
      setShowConfirmation(null)
    }
  }

  const getStatusBadge = (status: ContractStatus) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadgeClasses[status]}`}>
      {status}
    </span>
  )

  const getContractTimeline = () => {
    const now = new Date()
    const startDate = new Date(contract.startDate)
    const endDate = contract.endDate ? new Date(contract.endDate) : null
    
    const formatDate = (date: Date) => date.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })

    return (
      <div className="text-sm text-gray-600 space-y-1">
        <div>Started: {formatDate(startDate)}</div>
        {endDate && <div>Expires: {formatDate(endDate)}</div>}
        {contract.renewalDate && (
          <div>Renewal Due: {formatDate(new Date(contract.renewalDate))}</div>
        )}
      </div>
    )
  }

  const ConfirmationDialog = ({ status }: { status: ContractStatus }) => {
    const getConfirmationMessage = () => {
      switch (status) {
        case 'Active':
          return 'Are you sure you want to activate this contract? This will begin automatic balance tracking.'
        case 'Expired':
          return 'Are you sure you want to mark this contract as expired? This will stop balance tracking.'
        case 'Cancelled':
          return 'Are you sure you want to cancel this contract? This action cannot be undone.'
        case 'Renewed':
          return 'Are you sure you want to renew this contract? This will create a new contract linked to this one.'
        default:
          return 'Are you sure you want to change the contract status?'
      }
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold mb-4">Confirm Status Change</h3>
          <p className="text-gray-600 mb-6">{getConfirmationMessage()}</p>
          <div className="flex space-x-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowConfirmation(null)}
              disabled={isChanging}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => handleStatusChange(status)}
              disabled={isChanging}
              loading={isChanging}
            >
              Confirm
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-lg font-semibold mb-4">Contract Management</h3>
      
      {/* Current Status Display */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Current Status:</span>
          {getStatusBadge(contract.contractStatus)}
        </div>
        
        {/* Contract Timeline */}
        {getContractTimeline()}
        
        {/* Contract Details */}
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Original Amount:</span>
              <div className="font-semibold">${contract.originalAmount.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-gray-600">Current Balance:</span>
              <div className="font-semibold">${contract.currentBalance.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-gray-600">Drawdown Rate:</span>
              <div className="font-semibold">{contract.drawdownRate}</div>
            </div>
            <div>
              <span className="text-gray-600">Auto Drawdown:</span>
              <div className="font-semibold">{contract.autoDrawdown ? 'Enabled' : 'Disabled'}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Status Transition Buttons */}
      {validTransitions.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Available Actions:
          </label>
          {validTransitions.map(status => (
            <button
              key={status}
              onClick={() => setShowConfirmation(status)}
              disabled={disabled || isChanging}
              className="w-full text-left px-3 py-2 rounded-md border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <div className="flex items-center justify-between">
                <span>{statusTransitionLabels[status]}</span>
                {getStatusBadge(status)}
              </div>
            </button>
          ))}
        </div>
      )}
      
      {/* Confirmation Dialog */}
      {showConfirmation && <ConfirmationDialog status={showConfirmation} />}
    </div>
  )
}