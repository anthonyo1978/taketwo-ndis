"use client"

import { format } from "date-fns"
import { useState, useEffect } from "react"
import toast from 'react-hot-toast'
import type { FundingInformation, Resident, FundingManagementType } from "types/resident"
import type { PlanManager } from "types/plan-manager"
import { FUNDING_MANAGEMENT_TYPE_LABELS } from "types/plan-manager"
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
  const [isActivating, setIsActivating] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Participant funding level state
  const [fundingLevelLabel, setFundingLevelLabel] = useState('')
  const [fundingLevelNotes, setFundingLevelNotes] = useState('')
  const [isEditingFundingLevel, setIsEditingFundingLevel] = useState(false)
  const [isSavingFundingLevel, setIsSavingFundingLevel] = useState(false)
  
  // Funding management type and plan manager state
  const [fundingManagementType, setFundingManagementType] = useState<FundingManagementType | ''>('')
  const [selectedPlanManagerId, setSelectedPlanManagerId] = useState<string>('')
  const [planManagers, setPlanManagers] = useState<PlanManager[]>([])
  const [showAddPlanManagerModal, setShowAddPlanManagerModal] = useState(false)
  const [isSavingFundingManagement, setIsSavingFundingManagement] = useState(false)
  
  const activeContract = fundingInfo.find(c => c.contractStatus === 'Active')
  const draftContract = fundingInfo.find(c => c.contractStatus === 'Draft')
  const currentContract = activeContract || draftContract
  
  // Load resident data to get funding level and funding management
  useEffect(() => {
    const fetchResident = async () => {
      try {
        const response = await fetch(`/api/residents/${residentId}`)
        const result = await response.json() as { success: boolean; data?: Resident }
        if (result.success && result.data) {
          setFundingLevelLabel(result.data.participantFundingLevelLabel || '')
          setFundingLevelNotes(result.data.participantFundingLevelNotes || '')
          setFundingManagementType(result.data.fundingManagementType || '')
          setSelectedPlanManagerId(result.data.planManagerId || '')
        }
      } catch (error) {
        console.error('Failed to fetch resident:', error)
      }
    }
    fetchResident()
  }, [residentId])
  
  // Load plan managers list
  useEffect(() => {
    const fetchPlanManagers = async () => {
      try {
        const response = await fetch('/api/plan-managers')
        const result = await response.json() as { success: boolean; data?: PlanManager[] }
        if (result.success && result.data) {
          setPlanManagers(result.data)
        }
      } catch (error) {
        console.error('Failed to fetch plan managers:', error)
      }
    }
    fetchPlanManagers()
  }, [])
  
  // Save funding level
  const handleSaveFundingLevel = async () => {
    setIsSavingFundingLevel(true)
    try {
      const response = await fetch(`/api/residents/${residentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantFundingLevelLabel: fundingLevelLabel || '',
          participantFundingLevelNotes: fundingLevelNotes || ''
        })
      })
      
      const result = await response.json() as { success: boolean; error?: string }
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update funding level')
      }
      
      toast.success('Participant funding level updated!')
      setIsEditingFundingLevel(false)
    } catch (error) {
      console.error('Save funding level error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setIsSavingFundingLevel(false)
    }
  }
  
  // Save funding management type and plan manager
  const handleSaveFundingManagement = async () => {
    setIsSavingFundingManagement(true)
    try {
      const response = await fetch(`/api/residents/${residentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundingManagementType: fundingManagementType || null,
          planManagerId: fundingManagementType === 'plan_managed' ? (selectedPlanManagerId || null) : null
        })
      })
      
      const result = await response.json() as { success: boolean; error?: string }
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update funding management')
      }
      
      toast.success('Funding management updated!')
    } catch (error) {
      console.error('Save funding management error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setIsSavingFundingManagement(false)
    }
  }
  
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
        error?: { code: string; message: string; issues?: any[] }
      }
      
      if (!response.ok || !result.success) {
        // Log detailed error for debugging
        console.error('[PDF Generation] Error details:', result.error)
        
        // Show user-friendly error with details if available
        let errorMessage = result.error?.message || 'Failed to generate PDF'
        if (result.error?.issues && result.error.issues.length > 0) {
          const missingFields = result.error.issues.map((issue: any) => issue.path?.join('.') || issue.message).join(', ')
          errorMessage = `${errorMessage}: ${missingFields}`
        }
        
        throw new Error(errorMessage)
      }
      
      // Open PDF in new tab
      if (result.signedUrl) {
        window.open(result.signedUrl, '_blank')
      }
      
      toast.success('PDF opened in new tab!')
      
    } catch (error) {
      console.error('PDF generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate PDF')
    } finally {
      setIsGeneratingPdf(false)
    }
  }
  
  // Activate contract handler
  const handleActivateContract = async () => {
    if (!currentContract?.id) {
      toast.error('No contract available to activate')
      return
    }
    
    if (currentContract.contractStatus === 'Active') {
      toast.error('Contract is already active')
      return
    }
    
    if (!window.confirm('Are you sure you want to activate this contract? This will enable billing and make the contract operational.')) {
      return
    }
    
    setIsActivating(true)
    
    try {
      const response = await fetch(`/api/residents/${residentId}/funding/${currentContract.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'Active'
        })
      })
      
      const result = await response.json() as {
        success?: boolean
        data?: FundingInformation[]
        error?: string
        residentWarnings?: string[]
      }
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to activate contract')
      }
      
      // Update local state
      if (result.data) {
        onFundingChange(result.data)
      }
      
      toast.success('Contract activated successfully!')
      
      // Create persistent notification for resident readiness warnings
      if (result.residentWarnings && result.residentWarnings.length > 0) {
        console.log('[Frontend] Creating notification for resident warnings:', result.residentWarnings)
        
        // Create a single notification
        try {
          const response = await fetch('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title: 'Contract Activated',
              message: 'Please activate the resident and assign to a house to begin billing.',
              icon: '✅',
              category: 'system',
              priority: 'high',
              actionUrl: '' // Empty actionUrl - clicking notification goes to detail page
            })
          })
          
          if (!response.ok) {
            console.error('[Frontend] Failed to create notification:', await response.text())
          } else {
            console.log('[Frontend] Notification created successfully')
            
            // Show a quick toast to alert the user
            setTimeout(() => {
              toast('✅ Contract activated! Check notification panel for next steps', {
                duration: 5000,
                style: {
                  background: '#DBEAFE',
                  color: '#1E40AF',
                  border: '1px solid #93C5FD',
                }
              })
            }, 500)
          }
        } catch (error) {
          console.error('[Frontend] Error creating notification:', error)
        }
      }
      
    } catch (error) {
      console.error('Contract activation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to activate contract')
    } finally {
      setIsActivating(false)
    }
  }
  
  // Deactivate contract handler (Active → Draft)
  const handleDeactivateContract = async () => {
    if (!currentContract?.id) {
      toast.error('No contract available to deactivate')
      return
    }
    
    if (currentContract.contractStatus !== 'Active') {
      toast.error('Only active contracts can be deactivated')
      return
    }
    
    if (!window.confirm('Are you sure you want to deactivate this contract? This will set it back to Draft status.')) {
      return
    }
    
    setIsDeactivating(true)
    
    try {
      const response = await fetch(`/api/residents/${residentId}/funding/${currentContract.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'Draft'
        })
      })
      
      const result = await response.json() as {
        success?: boolean
        data?: FundingInformation[]
        error?: string
      }
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to deactivate contract')
      }
      
      // Update local state
      if (result.data) {
        onFundingChange(result.data)
      }
      
      toast.success('Contract deactivated successfully!')
      
    } catch (error) {
      console.error('Contract deactivation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate contract')
    } finally {
      setIsDeactivating(false)
    }
  }
  
  // Delete contract handler
  const handleDeleteContract = async () => {
    if (!currentContract?.id) {
      toast.error('No contract available to delete')
      return
    }
    
    // Check if any money has been drawn down
    const drawnDown = (currentContract.originalAmount || 0) - (currentContract.currentBalance || 0)
    
    if (drawnDown > 0) {
      toast.error(`Cannot delete contract: $${drawnDown.toFixed(2)} has been drawn down. Only contracts with no drawdowns can be deleted.`)
      return
    }
    
    if (!window.confirm(`⚠️ Are you sure you want to PERMANENTLY DELETE this contract?\n\nThis action cannot be undone.\n\nContract: ${currentContract.type}\nAmount: $${(currentContract.originalAmount || 0).toLocaleString()}`)) {
      return
    }
    
    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/residents/${residentId}/funding?fundingId=${currentContract.id}`, {
        method: 'DELETE'
      })
      
      const result = await response.json() as {
        success?: boolean
        data?: FundingInformation[]
        error?: string
        drawnDown?: number
      }
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete contract')
      }
      
      // Update local state
      if (result.data) {
        onFundingChange(result.data)
      }
      
      toast.success('Contract deleted successfully!')
      
    } catch (error) {
      console.error('Contract deletion error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete contract')
    } finally {
      setIsDeleting(false)
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

      {/* Participant Funding Level (Reference Only) */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏷️</span>
            <div>
              <h3 className="text-sm font-semibold text-amber-900">Participant Funding Level</h3>
              <p className="text-xs text-amber-700 mt-0.5">Reference only – does not drive billing or pricing</p>
            </div>
          </div>
          {!isEditingFundingLevel && (
            <button
              onClick={() => setIsEditingFundingLevel(true)}
              className="text-amber-700 hover:text-amber-900 text-sm font-medium"
            >
              Edit
            </button>
          )}
        </div>
        
        {isEditingFundingLevel ? (
          <div className="space-y-3">
            <div>
              <label htmlFor="fundingLevelLabel" className="block text-sm font-medium text-amber-900 mb-1">
                Funding Level Label
              </label>
              <input
                id="fundingLevelLabel"
                type="text"
                value={fundingLevelLabel}
                onChange={(e) => setFundingLevelLabel(e.target.value)}
                placeholder="e.g., Robust – 2 residents"
                maxLength={100}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
              />
              <p className="text-xs text-amber-700 mt-1">Optional label for the participant's SDA arrangement</p>
            </div>
            
            <div>
              <label htmlFor="fundingLevelNotes" className="block text-sm font-medium text-amber-900 mb-1">
                Notes <span className="text-amber-600 font-normal">(Optional)</span>
              </label>
              <textarea
                id="fundingLevelNotes"
                value={fundingLevelNotes}
                onChange={(e) => setFundingLevelNotes(e.target.value)}
                placeholder="Additional notes about the funding arrangement..."
                maxLength={500}
                rows={2}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white resize-none"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleSaveFundingLevel}
                disabled={isSavingFundingLevel}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isSavingFundingLevel ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsEditingFundingLevel(false)
                  // Reset to original values
                  const fetchResident = async () => {
                    try {
                      const response = await fetch(`/api/residents/${residentId}`)
                      const result = await response.json() as { success: boolean; data?: Resident }
                      if (result.success && result.data) {
                        setFundingLevelLabel(result.data.participantFundingLevelLabel || '')
                        setFundingLevelNotes(result.data.participantFundingLevelNotes || '')
                      }
                    } catch (error) {
                      console.error('Failed to fetch resident:', error)
                    }
                  }
                  fetchResident()
                }}
                className="px-4 py-2 bg-white border border-amber-300 text-amber-900 rounded-lg hover:bg-amber-50 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {fundingLevelLabel ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-amber-900">Label:</span>
                  <span className="px-3 py-1 bg-white border border-amber-300 rounded-md text-sm text-amber-900 font-medium">
                    {fundingLevelLabel}
                  </span>
                </div>
                {fundingLevelNotes && (
                  <div className="text-sm text-amber-800 bg-white border border-amber-200 rounded-md p-2">
                    <span className="font-medium">Notes:</span> {fundingLevelNotes}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-amber-700 italic">No funding level label set</p>
            )}
          </div>
        )}
      </div>

      {/* Funding Management Type & Plan Manager */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">💼</span>
            <div>
              <h3 className="text-sm font-semibold text-blue-900">Funding Management</h3>
              <p className="text-xs text-blue-700 mt-0.5">How the participant's NDIS funding is managed</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <label htmlFor="fundingManagementType" className="block text-sm font-medium text-blue-900 mb-1">
              Funding Management Type
            </label>
            <select
              id="fundingManagementType"
              value={fundingManagementType}
              onChange={(e) => {
                setFundingManagementType(e.target.value as FundingManagementType | '')
                if (e.target.value !== 'plan_managed') {
                  setSelectedPlanManagerId('')
                }
                // Auto-save on change
                setTimeout(() => handleSaveFundingManagement(), 100)
              }}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Select...</option>
              <option value="ndia">NDIA Managed</option>
              <option value="plan_managed">Plan Managed</option>
              <option value="self_managed">Self Managed</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          
          {fundingManagementType === 'plan_managed' && (
            <div className="space-y-3 pl-4 border-l-2 border-blue-300">
              <div>
                <label htmlFor="planManager" className="block text-sm font-medium text-blue-900 mb-1">
                  Plan Manager
                </label>
                <div className="flex gap-2">
                  <select
                    id="planManager"
                    value={selectedPlanManagerId}
                    onChange={(e) => {
                      setSelectedPlanManagerId(e.target.value)
                      setTimeout(() => handleSaveFundingManagement(), 100)
                    }}
                    className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">Select Plan Manager...</option>
                    {planManagers.map(pm => (
                      <option key={pm.id} value={pm.id}>{pm.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowAddPlanManagerModal(true)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap"
                  >
                    + Add New
                  </button>
                </div>
              </div>
              
              {selectedPlanManagerId && planManagers.find(pm => pm.id === selectedPlanManagerId) && (() => {
                const pm = planManagers.find(pm => pm.id === selectedPlanManagerId)!
                return (
                  <div className="bg-white border border-blue-200 rounded-md p-3">
                    <div className="text-sm font-semibold text-blue-900 mb-2">{pm.name}</div>
                    <div className="space-y-1 text-xs text-blue-800">
                      {pm.email && (
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">📧</span>
                          <a href={`mailto:${pm.email}`} className="hover:underline">{pm.email}</a>
                        </div>
                      )}
                      {pm.phone && (
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">📞</span>
                          <a href={`tel:${pm.phone}`} className="hover:underline">{pm.phone}</a>
                        </div>
                      )}
                      {pm.billingEmail && (
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">💳</span>
                          <span className="text-blue-600 text-xs">Billing:</span>
                          <a href={`mailto:${pm.billingEmail}`} className="hover:underline">{pm.billingEmail}</a>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
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
                {currentContract?.contractStatus === 'Draft' && (
                  <Button
                    onClick={handleActivateContract}
                    disabled={isActivating}
                    className="w-full justify-start bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                  >
                    <span className="mr-2">✅</span>
                    {isActivating ? 'Activating...' : 'Activate Contract'}
                  </Button>
                )}
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
                
                {/* Danger Zone Actions */}
                {currentContract && (
                  <>
                    {/* Deactivate button - only for Active contracts */}
                    {currentContract.contractStatus === 'Active' && (
                      <Button
                        onClick={handleDeactivateContract}
                        disabled={isDeactivating}
                        className="w-full justify-start bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-300"
                      >
                        <span className="mr-2">⏸️</span>
                        {isDeactivating ? 'Deactivating...' : 'Deactivate Contract'}
                      </Button>
                    )}
                    
                    {/* Delete button - for any contract with no drawdowns */}
                    <Button
                      onClick={handleDeleteContract}
                      disabled={isDeleting || getSpentAmount() > 0}
                      className="w-full justify-start bg-red-50 text-red-700 hover:bg-red-100 border border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={getSpentAmount() > 0 ? `Cannot delete: $${getSpentAmount().toFixed(2)} has been drawn down` : 'Permanently delete this contract'}
                    >
                      <span className="mr-2">🗑️</span>
                      {isDeleting ? 'Deleting...' : 'Delete Contract'}
                      {getSpentAmount() > 0 && <span className="ml-2 text-xs">(Has drawdowns)</span>}
                    </Button>
                  </>
                )}
                
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

      {/* Add Plan Manager Modal */}
      {showAddPlanManagerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Add Plan Manager</h2>
              <button
                onClick={() => setShowAddPlanManagerModal(false)}
                className="text-gray-400 hover:text-gray-600"
                type="button"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={async (e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const data = {
                name: formData.get('name') as string,
                email: formData.get('email') as string || undefined,
                phone: formData.get('phone') as string || undefined,
                billingEmail: formData.get('billingEmail') as string || undefined,
                notes: formData.get('notes') as string || undefined
              }
              
              try {
                const response = await fetch('/api/plan-managers', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                })
                
                const result = await response.json() as { success: boolean; data?: PlanManager; error?: string }
                if (!response.ok || !result.success) {
                  throw new Error(result.error || 'Failed to create plan manager')
                }
                
                // Add to list and select it
                if (result.data) {
                  setPlanManagers(prev => [...prev, result.data!])
                  setSelectedPlanManagerId(result.data.id)
                  setTimeout(() => handleSaveFundingManagement(), 100)
                }
                
                toast.success('Plan Manager added!')
                setShowAddPlanManagerModal(false)
              } catch (error) {
                console.error('Create plan manager error:', error)
                toast.error(error instanceof Error ? error.message : 'Failed to add plan manager')
              }
            }} className="p-6 space-y-4">
              <div>
                <label htmlFor="pmName" className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="pmName"
                  name="name"
                  type="text"
                  required
                  maxLength={100}
                  placeholder="e.g., ABC Plan Management"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="pmEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="pmEmail"
                  name="email"
                  type="email"
                  maxLength={100}
                  placeholder="contact@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="pmPhone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  id="pmPhone"
                  name="phone"
                  type="tel"
                  maxLength={50}
                  placeholder="0400 000 000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="pmBillingEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Email
                </label>
                <input
                  id="pmBillingEmail"
                  name="billingEmail"
                  type="email"
                  maxLength={100}
                  placeholder="billing@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="pmNotes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="pmNotes"
                  name="notes"
                  maxLength={500}
                  rows={2}
                  placeholder="Optional notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddPlanManagerModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Plan Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
