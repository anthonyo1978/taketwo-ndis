"use client"

import { format } from "date-fns"
import { useState } from "react"
import type { FundingInformation } from "types/resident"
import { ContractStatusManager } from "./ContractStatusManager"
import { FundingManager } from "./FundingManager"

interface ContractManagementTileProps {
  residentId: string
  fundingInfo: FundingInformation[]
  onFundingChange: (updatedFunding: FundingInformation[]) => void
}

export function ContractManagementTile({ residentId, fundingInfo, onFundingChange }: ContractManagementTileProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  
  const activeContract = fundingInfo.find(c => c.contractStatus === 'Active')
  const draftContract = fundingInfo.find(c => c.contractStatus === 'Draft')
  const currentContract = activeContract || draftContract
  
  // Calculate financial figures with safe access
  const getAllocatedAmount = () => {
    return currentContract ? (currentContract.originalAmount || currentContract.amount || 0) : 0
  }
  
  const getCurrentBalance = () => {
    return currentContract ? (currentContract.currentBalance || currentContract.amount || 0) : 0
  }
  
  const getSpentAmount = () => {
    if (!currentContract) return 0
    const original = currentContract.originalAmount || currentContract.amount || 0
    const current = currentContract.currentBalance || currentContract.amount || 0
    return original - current
  }
  
  const getStatusColor = (status: string) => {
    const colors = {
      'Draft': 'bg-gray-100 text-gray-800 border-gray-300',
      'Active': 'bg-green-100 text-green-800 border-green-300',
      'Expired': 'bg-red-100 text-red-800 border-red-300',
      'Cancelled': 'bg-orange-100 text-orange-800 border-orange-300',
      'Renewed': 'bg-blue-100 text-blue-800 border-blue-300'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300'
  }
  
  const getStatusIcon = (status: string) => {
    const icons = {
      'Draft': '📝',
      'Active': '✅',
      'Expired': '⏰',
      'Cancelled': '❌',
      'Renewed': '🔄'
    }
    return icons[status as keyof typeof icons] || '❓'
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Contract Management</h3>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2"
        >
          <span>{currentContract ? '✏️' : '+'}</span>
          <span>{currentContract ? 'Edit Contract' : 'New Contract'}</span>
        </button>
      </div>

      {currentContract ? (
        <div className="space-y-6">
          {/* Contract Information */}
          <div className="space-y-6">
            {/* Basic Contract Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Contract Details</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Start Date</span>
                    <span className="font-medium text-gray-900">
                      {format(new Date(currentContract.startDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">End Date</span>
                    <span className="font-medium text-gray-900">
                      {currentContract.endDate 
                        ? format(new Date(currentContract.endDate), 'MMM d, yyyy')
                        : 'Ongoing'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Original Amount</span>
                    <span className="font-medium text-gray-900">${getAllocatedAmount().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Current Balance</span>
                    <span className="font-medium text-gray-900">${getCurrentBalance().toLocaleString()}</span>
                  </div>
                  {currentContract.description && (
                    <div className="flex justify-between items-start">
                      <span className="text-gray-500">Description</span>
                      <span className="font-medium text-gray-900 text-right max-w-xs">{currentContract.description}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Status & Automation</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Status</span>
                    <div className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${getStatusColor(currentContract.contractStatus)}`}>
                      <span className="mr-1">{getStatusIcon(currentContract.contractStatus)}</span>
                      <span>{currentContract.contractStatus}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Automated Billing</span>
                    <span className={`font-medium ${currentContract.autoBillingEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                      {currentContract.autoBillingEnabled ? '✅ Enabled' : '❌ Disabled'}
                    </span>
                  </div>
                  {currentContract.autoBillingEnabled && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Automated Billing Frequency</span>
                        <span className="font-medium text-gray-900 capitalize">{currentContract.automatedDrawdownFrequency || 'fortnightly'}</span>
                      </div>
                      {currentContract.firstRunDate && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">First Automation Run</span>
                          <span className="font-medium text-gray-900">
                            {format(new Date(currentContract.firstRunDate), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                      {currentContract.nextRunDate && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Next Automation Run</span>
                          <span className="font-medium text-blue-600">
                            {format(new Date(currentContract.nextRunDate), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Status Controls */}
            <div className="pt-4 border-t">
              <ContractStatusManager 
                contract={currentContract}
                onContractChange={(updated: FundingInformation) => {
                  const updatedFunding = fundingInfo.map(f =>
                    f.id === updated.id ? updated : f
                  )
                  onFundingChange(updatedFunding)
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        // No Contract State
        <div className="text-center py-8 text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Active Contract</h4>
          <p className="text-gray-600 mb-4">Create a new funding contract to get started with financial management.</p>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-400">$0</div>
              <div className="text-xs text-gray-500">Allocated</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-400">$0</div>
              <div className="text-xs text-gray-500">Balance</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-400">$0</div>
              <div className="text-xs text-gray-500">Spent</div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for adding/editing contract */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <FundingManager
              residentId={residentId}
              fundingInfo={fundingInfo}
              editingContract={currentContract}
              onFundingChange={(updated) => {
                onFundingChange(updated)
                setShowAddForm(false)
              }}
            />
            <div className="p-4 border-t">
              <button
                onClick={() => setShowAddForm(false)}
                className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}