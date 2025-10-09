"use client"

import { format } from "date-fns"
import { useState } from "react"
import toast from 'react-hot-toast'
import type { FundingInformation } from "types/resident"
import { ContractStatusManager } from "./ContractStatusManager"
import { FundingManager } from "./FundingManager"
import { Button } from "components/Button/Button"

interface FundingDashboardProps {
  residentId: string
  fundingInfo: FundingInformation[]
  onFundingChange: (updatedFunding: FundingInformation[]) => void
}

export function FundingDashboard({ residentId, fundingInfo, onFundingChange }: FundingDashboardProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  
  const activeContract = fundingInfo.find(c => c.contractStatus === 'Active')
  const draftContract = fundingInfo.find(c => c.contractStatus === 'Draft')
  const currentContract = activeContract || draftContract
  
  // Generate PDF handler
  const handleGeneratePdf = async () => {
    if (!currentContract?.id) {
      toast.error('No contract available to generate PDF')
      return
    }
    
    setIsGeneratingPdf(true)
    
    try {
      const response = await fetch(`/api/contracts/${currentContract.id}/pdf`, {
        method: 'POST'
      })
      
      const result = await response.json() as {
        success?: boolean
        signedUrl?: string
        error?: { code: string; message: string }
      }
      
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to generate PDF')
      }
      
      // Download the PDF
      if (result.signedUrl) {
        const link = document.createElement('a')
        link.href = result.signedUrl
        link.download = `NDIS-Contract-${currentContract.id.substring(0, 8)}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
      
      toast.success('PDF generated successfully!')
      
    } catch (error) {
      console.error('PDF generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate PDF')
    } finally {
      setIsGeneratingPdf(false)
    }
  }
  
  // Calculate financial figures
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

  const getSpentPercentage = () => {
    if (!currentContract) return 0
    const original = currentContract.originalAmount || currentContract.amount || 0
    const spent = getSpentAmount()
    return original > 0 ? (spent / original) * 100 : 0
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

  const getFundingModelColor = (type: string) => {
    const colors = {
      'Draw Down': 'bg-blue-100 text-blue-800',
      'Capture & Invoice': 'bg-green-100 text-green-800',
      'Hybrid': 'bg-purple-100 text-purple-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Header with Action */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Funding & Contracts</h2>
          <p className="text-gray-600 mt-1">Manage funding contracts and financial allocations</p>
        </div>
        <div className="flex items-center gap-3">
          {currentContract && (
            <Button
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              className="bg-purple-600 text-white hover:bg-purple-700 flex items-center space-x-2"
            >
              <span>📄</span>
              <span>{isGeneratingPdf ? 'Generating...' : 'Generate PDF'}</span>
            </Button>
          )}
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white hover:bg-blue-700 flex items-center space-x-2"
          >
            <span>{currentContract ? '✏️' : '+'}</span>
            <span>{currentContract ? 'Edit Contract' : 'New Contract'}</span>
          </Button>
        </div>
      </div>

      {currentContract ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Contract Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contract Overview Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">Contract Details</h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentContract.contractStatus)}`}>
                      <span className="mr-1">{getStatusIcon(currentContract.contractStatus)}</span>
                      {currentContract.contractStatus}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getFundingModelColor(currentContract.type)}`}>
                      {currentContract.type}
                    </span>
                    <span className="text-sm text-gray-500">
                      {currentContract.supportItemCode && `• ${currentContract.supportItemCode}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contract Information Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Start Date</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(currentContract.startDate), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">End Date</p>
                  <p className="font-medium text-gray-900">
                    {currentContract.endDate 
                      ? format(new Date(currentContract.endDate), 'MMM d, yyyy')
                      : 'Ongoing'
                    }
                  </p>
                </div>
                {currentContract.durationDays && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Duration</p>
                    <p className="font-medium text-purple-600">
                      {currentContract.durationDays} day{currentContract.durationDays !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Contract length
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500 mb-1">Automated Billing</p>
                  <p className={`font-medium ${currentContract.autoBillingEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                    {currentContract.autoBillingEnabled ? '✅ Enabled' : '❌ Disabled'}
                  </p>
                  {currentContract.autoBillingEnabled && (
                    <p className="text-xs text-gray-500 mt-1">
                      Frequency: {currentContract.automatedDrawdownFrequency || 'fortnightly'}
                    </p>
                  )}
                </div>
                {currentContract.autoBillingEnabled && currentContract.nextRunDate && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Next Run Date</p>
                    <p className="font-medium text-blue-600">
                      {format(new Date(currentContract.nextRunDate), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Automated billing
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              {currentContract.description && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-gray-900">{currentContract.description}</p>
                </div>
              )}

              {/* Status Management */}
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

          {/* Financial Summary Sidebar */}
          <div className="space-y-6">
            {/* Financial Overview Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h3>
              
              {/* Key Metrics */}
              <div className="space-y-4">
                <div className="text-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                  <div className="text-3xl font-bold text-green-800">
                    ${getAllocatedAmount().toLocaleString()}
                  </div>
                  <div className="text-sm text-green-600 font-medium">Total Allocated</div>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <div className="text-3xl font-bold text-blue-800">
                    ${getCurrentBalance().toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-600 font-medium">Remaining Balance</div>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                  <div className="text-3xl font-bold text-orange-800">
                    ${getSpentAmount().toLocaleString()}
                  </div>
                  <div className="text-sm text-orange-600 font-medium">Amount Spent</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Spending Progress</span>
                  <span>{getSpentPercentage().toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-orange-400 to-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(getSpentPercentage(), 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  onClick={handleGeneratePdf}
                  disabled={isGeneratingPdf}
                  className="w-full justify-start bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                >
                  <span className="mr-2">📄</span>
                  {isGeneratingPdf ? 'Generating PDF...' : 'Generate PDF Contract'}
                </Button>
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="w-full justify-start bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                >
                  <span className="mr-2">✏️</span>
                  Edit Contract
                </Button>
                <Button
                  onClick={() => window.open(`/transactions?residentId=${residentId}`, '_blank')}
                  className="w-full justify-start bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                >
                  <span className="mr-2">💳</span>
                  View Transactions
                </Button>
                <Button
                  onClick={() => window.open(`/transactions?residentId=${residentId}&action=create`, '_blank')}
                  className="w-full justify-start bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                >
                  <span className="mr-2">➕</span>
                  New Transaction
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // No Contract State - Clean Empty State
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Contract</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Create a new funding contract to start managing financial allocations and track spending for this resident.
          </p>
          
          {/* Empty State Metrics */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-400">$0</div>
              <div className="text-xs text-gray-500">Allocated</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-400">$0</div>
              <div className="text-xs text-gray-500">Balance</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-400">$0</div>
              <div className="text-xs text-gray-500">Spent</div>
            </div>
          </div>

          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <span className="mr-2">➕</span>
            Create First Contract
          </Button>
        </div>
      )}

      {/* Modal for adding/editing contract */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {currentContract ? 'Edit Contract' : 'Create New Contract'}
              </h2>
            </div>
            <div className="p-6">
              <FundingManager
                residentId={residentId}
                fundingInfo={fundingInfo}
                editingContract={currentContract}
                onFundingChange={(updated) => {
                  onFundingChange(updated)
                  setShowAddForm(false)
                }}
              />
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <Button
                onClick={() => setShowAddForm(false)}
                className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
