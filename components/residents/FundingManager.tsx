"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "components/ui/Dialog"
import { Input } from "components/ui/Input"
import type { ContractStatus, FundingInformation, FundingModel } from "types/resident"

interface FundingManagerProps {
  residentId: string
  fundingInfo: FundingInformation[]
  onFundingChange?: (updatedFunding: FundingInformation[]) => void
  editingContract?: FundingInformation | null
}

interface ApiResponse {
  success: boolean
  data?: FundingInformation | FundingInformation[]
  error?: string
  details?: Array<{ message: string }>
}

const fundingFormSchema = z.object({
  type: z.enum(['Draw Down', 'Capture & Invoice', 'Hybrid'] as const),
  amount: z.number()
    .min(0, "Funding amount must be positive")
    .max(999999.99, "Funding amount must be less than $1,000,000")
    .refine(val => Number.isFinite(val), "Invalid funding amount"),
  startDate: z.string(),
  endDate: z.string().optional(),
  description: z.string()
    .max(200, "Description must be no more than 200 characters")
    .optional()
    .or(z.literal('')),
  renewalDate: z.string().optional(),
  // Automation fields
  autoBillingEnabled: z.boolean().default(false),
  automatedDrawdownFrequency: z.enum(['daily', 'weekly', 'fortnightly'] as const).default('fortnightly'),
  firstRunDate: z.string().optional(),
  nextRunDate: z.string().optional(),
  // Duration field (calculated from start/end dates)
  durationDays: z.number().int().positive().optional()
}).refine(
  (data) => !data.endDate || !data.startDate || new Date(data.startDate) <= new Date(data.endDate),
  {
    message: "End date must be after start date",
    path: ["endDate"]
  }
).refine(
  (data) => !data.renewalDate || !data.startDate || new Date(data.renewalDate) > new Date(data.startDate),
  {
    message: "Renewal date must be after start date",
    path: ["renewalDate"]
  }
).refine(
  (data) => !data.firstRunDate || !data.startDate || new Date(data.firstRunDate) >= new Date(data.startDate),
  {
    message: "First run date must be on or after contract start date",
    path: ["firstRunDate"]
  }
).refine(
  (data) => !data.firstRunDate || !data.endDate || new Date(data.firstRunDate) <= new Date(data.endDate),
  {
    message: "First run date must be on or before contract end date",
    path: ["firstRunDate"]
  }
).refine(
  (data) => !data.autoBillingEnabled || data.firstRunDate,
  {
    message: "First run date is required when automated billing is enabled",
    path: ["firstRunDate"]
  }
)

type FundingFormData = z.infer<typeof fundingFormSchema>

const fundingModelOptions: { value: FundingModel; label: string; description: string }[] = [
  { value: 'Draw Down', label: 'Draw Down', description: 'Funding reduces over time based on contract period' },
  { value: 'Capture & Invoice', label: 'Capture & Invoice', description: 'Funding captured and invoiced post-service delivery' },
  { value: 'Hybrid', label: 'Hybrid', description: 'Combination of draw down and capture & invoice models' }
]

const automatedDrawdownFrequencyOptions: { value: string; label: string; description: string }[] = [
  { value: 'daily', label: 'Daily', description: 'Every calendar day' },
  { value: 'weekly', label: 'Weekly', description: 'Every 7th day' },
  { value: 'fortnightly', label: 'Fortnightly', description: 'Every 14th day' }
]

export function FundingManager({ residentId, fundingInfo, onFundingChange, editingContract }: FundingManagerProps) {
  const [showAddForm, setShowAddForm] = useState(!!editingContract)
  const [editingFunding, setEditingFunding] = useState<FundingInformation | null>(editingContract || null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [calculatedDailyRate, setCalculatedDailyRate] = useState<number | null>(null)
  const [rateCalculationError, setRateCalculationError] = useState<string | null>(null)
  
  // Calculate daily rate when automation is enabled
  const calculateDailyRate = async (amount: number, startDate: string, endDate: string | null, frequency: string) => {
    if (!amount || !startDate || !endDate || !frequency) {
      setCalculatedDailyRate(null)
      setRateCalculationError(null)
      return
    }
    
    try {
      const response = await fetch('/api/automation/calculate-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'calculate',
          amount,
          startDate,
          endDate,
          frequency
        })
      })
      
      const result = await response.json() as any
      
      if (result.success && result.data.calculation.isValid) {
        setCalculatedDailyRate(result.data.calculation.dailyRate)
        setRateCalculationError(null)
      } else {
        setCalculatedDailyRate(null)
        setRateCalculationError(result.data?.calculation?.errors?.join(', ') || 'Calculation failed')
      }
    } catch (error) {
      setCalculatedDailyRate(null)
      setRateCalculationError('Failed to calculate daily rate')
    }
  }
  
  const form = useForm<FundingFormData>({
    resolver: zodResolver(fundingFormSchema) as any,
    defaultValues: editingContract ? {
      type: editingContract.type,
      amount: editingContract.amount,
      startDate: editingContract.startDate ? new Date(editingContract.startDate).toISOString().split('T')[0] : undefined,
      endDate: editingContract.endDate ? new Date(editingContract.endDate).toISOString().split('T')[0] : undefined,
      description: editingContract.description || '',
      renewalDate: editingContract.renewalDate ? new Date(editingContract.renewalDate).toISOString().split('T')[0] : undefined,
      // Automation fields
      autoBillingEnabled: editingContract.autoBillingEnabled || false,
      automatedDrawdownFrequency: editingContract.automatedDrawdownFrequency || 'fortnightly',
      firstRunDate: editingContract.firstRunDate ? new Date(editingContract.firstRunDate).toISOString().split('T')[0] : undefined,
      nextRunDate: editingContract.nextRunDate ? new Date(editingContract.nextRunDate).toISOString().split('T')[0] : undefined,
      // Duration field
      durationDays: editingContract.durationDays || undefined
    } : {
      type: 'Draw Down',
      amount: 0,
      startDate: new Date().toISOString().split('T')[0],
      // Automation fields
      autoBillingEnabled: false,
      automatedDrawdownFrequency: 'fortnightly',
      firstRunDate: undefined,
      nextRunDate: undefined,
      // Duration field
      durationDays: undefined
    }
  })
  
  // Watch for changes in automation fields to trigger calculation
  const watchedValues = form.watch(['autoBillingEnabled', 'amount', 'startDate', 'endDate', 'automatedDrawdownFrequency'])
  
  useEffect(() => {
    const [autoBillingEnabled, amount, startDate, endDate, frequency] = watchedValues
    
    if (autoBillingEnabled && amount && startDate && endDate && frequency) {
      calculateDailyRate(amount, startDate, endDate, frequency)
    } else {
      setCalculatedDailyRate(null)
      setRateCalculationError(null)
    }
  }, [watchedValues])

  // Calculate contract duration
  const calculateContractDuration = (startDate: string, endDate: string): number | null => {
    if (!startDate || !endDate) return null
    
    try {
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      if (start > end) return null // Invalid date range
      
      const timeDiff = end.getTime() - start.getTime()
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end dates
      
      return daysDiff
    } catch (error) {
      return null
    }
  }

  // Calculate daily support item cost
  const calculateDailySupportItemCost = (amount: number, startDate: Date, endDate?: Date): number => {
    if (!endDate) return 0 // Cannot calculate without end date
    
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    if (totalDays <= 0) return 0
    
    return amount / totalDays
  }

  // Calculate next run date based on first run date and frequency
  const calculateNextRunDate = (firstRunDate: Date, frequency: string): Date => {
    const nextDate = new Date(firstRunDate)
    
    switch (frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1)
        break
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7)
        break
      case 'fortnightly':
        nextDate.setDate(nextDate.getDate() + 14)
        break
      default:
        nextDate.setDate(nextDate.getDate() + 14) // Default to fortnightly
    }
    
    return nextDate
  }

  // Get today's date for first run date minimum
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const openAddForm = () => {
    setEditingFunding(null)
    form.reset({
      type: 'Draw Down',
      amount: 0,
      startDate: new Date().toISOString().split('T')[0],
      // Automation fields
      autoBillingEnabled: false,
      automatedDrawdownFrequency: 'fortnightly',
      firstRunDate: undefined,
      nextRunDate: undefined
    })
    setShowAddForm(true)
    setError(null)
  }

  const openEditForm = (funding: FundingInformation) => {
    setEditingFunding(funding)
    
    // Helper function to format dates for HTML date inputs
    const formatDateForInput = (date: Date | undefined): string | undefined => {
      if (!date) return undefined
      return new Date(date).toISOString().split('T')[0]
    }
    
    form.reset({
      type: funding.type,
      amount: funding.amount,
      startDate: formatDateForInput(funding.startDate),
      endDate: formatDateForInput(funding.endDate),
      description: funding.description || '',
      renewalDate: formatDateForInput(funding.renewalDate),
      // Automation fields
      autoBillingEnabled: funding.autoBillingEnabled || false,
      automatedDrawdownFrequency: funding.automatedDrawdownFrequency || 'fortnightly',
      firstRunDate: formatDateForInput(funding.firstRunDate),
      nextRunDate: formatDateForInput(funding.nextRunDate)
    })
    setShowAddForm(true)
    setError(null)
  }

  const closeForm = () => {
    setShowAddForm(false)
    setEditingFunding(null)
    setError(null)
    form.reset()
  }

  const onSubmit = async (data: FundingFormData) => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      // Calculate daily support item cost
      const dailySupportItemCost = calculateDailySupportItemCost(data.amount, new Date(data.startDate), data.endDate ? new Date(data.endDate) : undefined)
      
      // All new contracts start as Draft - will be activated separately
      const contractStatus: ContractStatus = editingFunding?.contractStatus || 'Draft'
      
      // Calculate next run date if automation is enabled
      let nextRunDate = data.nextRunDate ? new Date(data.nextRunDate) : undefined
      if (data.autoBillingEnabled && data.firstRunDate && data.automatedDrawdownFrequency) {
        nextRunDate = calculateNextRunDate(new Date(data.firstRunDate), data.automatedDrawdownFrequency)
      }

      // Calculate duration in days if both start and end dates are provided
      let durationDays: number | undefined = undefined
      if (data.startDate && data.endDate) {
        const calculatedDuration = calculateContractDuration(data.startDate, data.endDate)
        durationDays = calculatedDuration || undefined
      }

      const submissionData = {
        ...data,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : undefined,
        firstRunDate: data.firstRunDate ? new Date(data.firstRunDate) : undefined,
        dailySupportItemCost,
        contractStatus,
        nextRunDate,
        durationDays
      }
      
      // Remove undefined values to avoid validation issues
      Object.keys(submissionData).forEach(key => {
        if (submissionData[key as keyof typeof submissionData] === undefined) {
          delete submissionData[key as keyof typeof submissionData]
        }
      })
      
      
      if (editingFunding || editingContract) {
        const contractToEdit = editingFunding || editingContract!
        // Update existing funding
        const response = await fetch(`/api/residents/${residentId}/funding`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fundingId: contractToEdit.id,
            ...submissionData
          })
        })
        
        const result = await response.json() as ApiResponse
        
        if (result.success && result.data) {
          const updatedFunding = fundingInfo.map(f => 
            f.id === contractToEdit.id ? result.data as FundingInformation : f
          )
          onFundingChange?.(updatedFunding)
          closeForm()
        } else {
          setError(result.error || 'Failed to update funding information')
        }
      } else {
        // Add new funding
        const response = await fetch(`/api/residents/${residentId}/funding`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(submissionData)
        })
        
        const result = await response.json() as ApiResponse
        
        if (result.success && result.data) {
          const newFunding = [...fundingInfo, result.data as FundingInformation]
          onFundingChange?.(newFunding)
          closeForm()
        } else {
          setError(result.error || 'Failed to add funding information')
        }
      }
    } catch (error) {
      setError('Network error. Please try again.')
      console.error('Error managing funding:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const removeFunding = async (fundingId: string) => {
    if (!confirm('Are you sure you want to remove this funding information?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/residents/${residentId}/funding?fundingId=${fundingId}`, {
        method: 'DELETE'
      })
      
      const result = await response.json() as ApiResponse
      
      if (result.success) {
        const updatedFunding = fundingInfo.filter(f => f.id !== fundingId)
        onFundingChange?.(updatedFunding)
      } else {
        alert(result.error || 'Failed to remove funding information')
      }
    } catch (error) {
      alert('Network error. Please try again.')
      console.error('Error removing funding:', error)
    }
  }

  const getFundingTypeColor = (type: FundingModel) => {
    const colors = {
      'Draw Down': 'bg-blue-100 text-blue-800',
      'Capture & Invoice': 'bg-green-100 text-green-800', 
      'Hybrid': 'bg-purple-100 text-purple-800'
    }
    return colors[type]
  }

  const formatDateRange = (startDate: Date, endDate?: Date) => {
    const start = new Date(startDate).toLocaleDateString()
    if (endDate) {
      const end = new Date(endDate).toLocaleDateString()
      return `${start} - ${end}`
    }
    return `${start} - Ongoing`
  }

  return (
    <div className="space-y-6">
      {/* Only show the contract list when not editing a specific contract */}
      {!editingContract && (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Add New Contract</h3>
          <button 
            onClick={openAddForm}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            + Add Contract
          </button>
        </div>
        
        {/* Draft Contracts Only */}
        {fundingInfo.filter(f => f.contractStatus === 'Draft').length > 0 ? (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Draft Contracts</h4>
            {fundingInfo
              .filter(f => f.contractStatus === 'Draft')
              .map(funding => (
                <div key={funding.id} className="space-y-4">
                  <div className={`p-6 rounded-lg border-2 ${
                    funding.contractStatus === 'Active' ? 'border-green-200 bg-green-50' :
                    funding.contractStatus === 'Draft' ? 'border-blue-200 bg-blue-50' :
                    funding.contractStatus === 'Expired' ? 'border-red-200 bg-red-50' :
                    'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getFundingTypeColor(funding.type)}`}>
                          {funding.type}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          funding.contractStatus === 'Draft' ? 'bg-gray-100 text-gray-800' :
                          funding.contractStatus === 'Active' ? 'bg-green-100 text-green-800' :
                          funding.contractStatus === 'Expired' ? 'bg-red-100 text-red-800' :
                          funding.contractStatus === 'Cancelled' ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {funding.contractStatus}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEditForm(funding)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Edit Contract
                        </button>
                        <button
                          onClick={() => removeFunding(funding.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          ${funding.originalAmount.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">Original Amount</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          ${funding.currentBalance.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">Current Balance</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          ${(funding.originalAmount - funding.currentBalance).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">Drawn Down</div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        <span className="font-medium">Period:</span> {formatDateRange(funding.startDate, funding.endDate)}
                      </div>
                      <div>
                        <span className="font-medium">Automated Billing:</span> {funding.autoBillingEnabled ? '✅ Enabled' : '❌ Disabled'}
                        {funding.autoBillingEnabled && ` (${funding.automatedDrawdownFrequency || 'fortnightly'})`}
                      </div>
                      {funding.description && (
                        <div>
                          <span className="font-medium">Description:</span> {funding.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <p className="text-lg font-medium mb-2">No funding contracts</p>
            <p className="mb-4">Create funding contracts to track financial support and balance drawdown over time.</p>
            <button
              onClick={openAddForm}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add First Contract
            </button>
          </div>
        )}
      </div>
      )}
      
      {/* Add/Edit Funding Dialog */}
      <Dialog open={showAddForm} onClose={closeForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFunding || editingContract ? 'Edit Funding Contract' : 'Create Funding Contract'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4 max-h-96 overflow-y-auto">
            {/* Funding Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Funding Type *
              </label>
              <Controller
                name="type"
                control={form.control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {fundingModelOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label} - {option.description}
                      </option>
                    ))}
                  </select>
                )}
              />
              {form.formState.errors.type && (
                <p className="text-red-600 text-sm mt-1">{form.formState.errors.type.message}</p>
              )}
            </div>
            
            {/* Amount */}
            <div>
              <Input
                label="Amount *"
                type="number"
                step="0.01"
                min="0"
                max="999999.99"
                placeholder="0.00"
                {...form.register("amount", { valueAsNumber: true })}
                error={form.formState.errors.amount?.message}
              />
            </div>
            
            {/* Start Date */}
            <div>
              <Input
                label="Start Date *"
                type="date"
                {...form.register("startDate")}
                error={form.formState.errors.startDate?.message}
              />
            </div>
            
            {/* End Date */}
            <div>
              <Input
                label="End Date (Optional)"
                type="date"
                {...form.register("endDate")}
                error={form.formState.errors.endDate?.message}
              />
            </div>
            
            {/* Contract Duration Display */}
            {(() => {
              const startDate = form.watch("startDate")
              const endDate = form.watch("endDate")
              
              if (!startDate || !endDate) return null
              
              const duration = calculateContractDuration(startDate, endDate)
              
              if (duration !== null && duration > 0) {
                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-blue-800 font-medium">
                        Contract Duration: {duration} day{duration !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="text-sm text-blue-700 mt-1">
                      From {new Date(startDate).toLocaleDateString('en-AU')} to {new Date(endDate).toLocaleDateString('en-AU')}
                    </div>
                  </div>
                )
              }
              
              if (duration === null) {
                return (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-red-800 font-medium">
                        Invalid Date Range
                      </span>
                    </div>
                    <div className="text-sm text-red-700 mt-1">
                      End date must be after start date
                    </div>
                  </div>
                )
              }
              
              return null
            })()}
            
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                {...form.register("description")}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes about this funding..."
              />
              {form.formState.errors.description && (
                <p className="text-red-600 text-sm mt-1">{form.formState.errors.description.message}</p>
              )}
            </div>

            {/* Renewal Date */}
            <div>
              <Input
                label="Renewal Date (Optional)"
                type="date"
                {...form.register("renewalDate")}
                error={form.formState.errors.renewalDate?.message}
              />
              <p className="text-xs text-gray-500 mt-1">
                Set a reminder date for contract renewal
              </p>
            </div>

            {/* Automation Settings */}
            <div className="space-y-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700">Automated Billing Settings</h4>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...form.register("autoBillingEnabled")}
                  id="autoBillingEnabled"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="autoBillingEnabled" className="ml-2 block text-sm text-gray-900">
                  Enable Automated Billing
                </label>
              </div>
              
              {form.watch("autoBillingEnabled") && (
                <div className="space-y-3 ml-6 border-l-2 border-blue-200 pl-4">
                  {/* Automated Drawdown Frequency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Automated Drawdown Frequency *
                    </label>
                    <Controller
                      name="automatedDrawdownFrequency"
                      control={form.control}
                      render={({ field }) => (
                        <select
                          {...field}
                          onChange={(e) => {
                            field.onChange(e)
                            const firstRunDate = form.getValues("firstRunDate")
                            if (firstRunDate && e.target.value) {
                              const nextRunDate = calculateNextRunDate(new Date(firstRunDate), e.target.value)
                              form.setValue("nextRunDate", nextRunDate.toISOString().split('T')[0])
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {automatedDrawdownFrequencyOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label} - {option.description}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    {form.formState.errors.automatedDrawdownFrequency && (
                      <p className="text-red-600 text-sm mt-1">{form.formState.errors.automatedDrawdownFrequency.message}</p>
                    )}
                  </div>
                  
                  {/* Calculated Daily Rate Display */}
                  {calculatedDailyRate && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-sm font-medium text-blue-900 mb-2">
                        📊 Calculated Daily Rate
                      </div>
                      <div className="text-sm text-blue-800 space-y-1">
                        <div><strong>Daily Rate:</strong> ${calculatedDailyRate.toFixed(2)}</div>
                        <div><strong>Weekly Rate:</strong> ${(calculatedDailyRate * 7).toFixed(2)}</div>
                        <div><strong>Fortnightly Rate:</strong> ${(calculatedDailyRate * 14).toFixed(2)}</div>
                      </div>
                      <div className="text-xs text-blue-600 mt-2">
                        💡 This rate is automatically calculated based on your contract amount and duration
                      </div>
                    </div>
                  )}
                  
                  {rateCalculationError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-sm font-medium text-red-900 mb-1">
                        ⚠️ Rate Calculation Error
                      </div>
                      <div className="text-sm text-red-800">
                        {rateCalculationError}
                      </div>
                    </div>
                  )}
                  
                  {/* First Run Date */}
                  <div>
                    <Input
                      label="First Run Date *"
                      type="date"
                      min={getTodayDate()}
                      {...form.register("firstRunDate", {
                        onChange: () => {
                          const firstRunDate = form.getValues("firstRunDate")
                          const frequency = form.getValues("automatedDrawdownFrequency")
                          if (firstRunDate && frequency) {
                            const nextRunDate = calculateNextRunDate(new Date(firstRunDate), frequency)
                            form.setValue("nextRunDate", nextRunDate.toISOString().split('T')[0])
                          }
                        }
                      })}
                      error={form.formState.errors.firstRunDate?.message}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      When should automated billing start for this contract? Must be today or in the future.
                    </p>
                  </div>

                  {/* Next Run Date (calculated, read-only) */}
                  <div>
                    <Input
                      label="Next Run Date (Auto-calculated)"
                      type="date"
                      value={form.watch("nextRunDate") || ''}
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Automatically calculated based on first run date and frequency
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-red-800 text-sm">{error}</div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={closeForm}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting 
                  ? (editingFunding || editingContract ? 'Updating...' : 'Creating...')
                  : (editingFunding || editingContract ? 'Update Contract' : 'Create Contract')
                }
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}