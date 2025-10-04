"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "components/ui/Dialog"
import { Button } from "components/Button/Button"
import { Input } from "components/ui/Input"
import { getResidentsFromStorage } from "lib/utils/resident-storage"
import { 
  validateDrawdownInput, 
  canPostDrawdownTransaction,
  getDrawdownValidationErrors 
} from "lib/utils/drawdown-validation"
import { COMMON_SERVICE_CODES } from "types/transaction"
import type { TransactionCreateInput, DrawdownValidationResult } from "types/transaction"

// Drawing Down specific form schema with mandatory NDIS fields
const drawingDownSchema = z.object({
  residentId: z.string().min(1, "Please select a participant"),
  contractId: z.string().min(1, "Please select a support agreement"),
  occurredAt: z.coerce.date(),
  serviceCode: z.string().min(1, "Service code is required"),
  serviceItemCode: z.string().min(1, "NDIS service item code is required"),
  description: z.string().min(1, "Specific support description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().nonnegative("Unit price must be non-negative"),
  amount: z.number().positive("Amount must be greater than zero").optional(),
  note: z.string().optional(),
  supportAgreementId: z.string().optional()
})

type DrawingDownFormData = z.infer<typeof drawingDownSchema>

interface DrawingDownDialogProps {
  onClose: () => void
  onSuccess: () => void
}

export function DrawingDownDialog({ onClose, onSuccess }: DrawingDownDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<DrawdownValidationResult | null>(null)
  const [residents, setResidents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedContractInfo, setSelectedContractInfo] = useState<any>(null)

  const form = useForm<DrawingDownFormData>({
    resolver: zodResolver(drawingDownSchema),
    defaultValues: {
      occurredAt: new Date(),
      quantity: 1,
      unitPrice: 0,
      isDrawdownTransaction: true,
      serviceCode: 'DRAWDOWN',
      serviceItemCode: '' // Will be required to be selected
    }
  })

  const watchedValues = form.watch()

  // Set Drawing Down specific values
  useEffect(() => {
    form.setValue('serviceCode', 'DRAWDOWN')
    form.setValue('isDrawdownTransaction', true)
  }, [form])

  // Fetch residents data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const residentsData = getResidentsFromStorage()
        setResidents(residentsData)
      } catch (err) {
        setError('Failed to load residents data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Real-time validation as user types
  useEffect(() => {
    if (watchedValues.residentId && watchedValues.contractId && watchedValues.amount) {
      const input: TransactionCreateInput = {
        ...watchedValues,
        serviceCode: 'DRAWDOWN', // Default service code for Drawing Down
        isDrawdownTransaction: true,
        // Ensure serviceItemCode is included for validation
        serviceItemCode: watchedValues.serviceItemCode || ''
      }
      
      const validation = validateDrawdownInput(input)
      
      // Calculate actual balance impact
      let balanceImpact = {
        contractId: watchedValues.contractId,
        currentBalance: 0,
        impactAmount: watchedValues.amount || 0,
        newBalance: 0,
        isValid: false,
        errorMessage: 'Contract not found'
      }
      
      if (watchedValues.contractId && selectedResident) {
        const contract = selectedResident.fundingInformation.find((c: any) => c.id === watchedValues.contractId)
        if (contract) {
          const currentBalance = contract.currentBalance || contract.amount || 0
          const impactAmount = watchedValues.amount || 0
          const newBalance = Math.max(0, currentBalance - impactAmount)
          
          balanceImpact = {
            contractId: watchedValues.contractId,
            currentBalance,
            impactAmount,
            newBalance,
            isValid: newBalance >= 0,
            errorMessage: newBalance < 0 ? 'Insufficient balance' : ''
          }
        }
      }
      
      setValidationResult({
        isValid: validation.isValid && balanceImpact.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        balanceImpact,
        canProceed: validation.isValid && balanceImpact.isValid
      })
    }
  }, [watchedValues, selectedResident])

  // Calculate amount when quantity or unit price changes
  useEffect(() => {
    if (watchedValues.quantity && watchedValues.unitPrice) {
      const calculatedAmount = watchedValues.quantity * watchedValues.unitPrice
      form.setValue('amount', calculatedAmount)
    }
  }, [watchedValues.quantity, watchedValues.unitPrice, form])

  // Reset contract when resident changes
  useEffect(() => {
    form.setValue('contractId', '')
    setSelectedContractInfo(null)
  }, [watchedValues.residentId, form])

  // Handle contract selection to show contract details
  const handleContractChange = (contractId: string) => {
    if (selectedResident && contractId) {
      const contract = selectedResident.fundingInformation.find((c: any) => c.id === contractId)
      setSelectedContractInfo(contract)
    } else {
      setSelectedContractInfo(null)
    }
  }

  const selectedResident = residents.find(r => r.id === watchedValues.residentId)

  const onSubmit = async (data: DrawingDownFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Ensure amount is calculated if not provided
      const calculatedAmount = data.amount || (data.quantity * data.unitPrice)
      
      const input: TransactionCreateInput = {
        ...data,
        // Ensure date is properly formatted
        occurredAt: data.occurredAt instanceof Date ? data.occurredAt : new Date(data.occurredAt),
        // Override with Drawing Down specific values
        serviceCode: 'DRAWDOWN',
        isDrawdownTransaction: true,
        amount: calculatedAmount
      }
      
      // Debug logging
      console.log('Drawing Down form data:', data)
      console.log('Drawing Down transaction input:', input)
      console.log('serviceCode in data:', data.serviceCode)
      console.log('serviceCode in input:', input.serviceCode)

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })

      const result = await response.json()

      if (result.success) {
        onSuccess()
      } else {
        const errorMessage = result.details ? 
          Array.isArray(result.details) ? result.details.join(', ') : result.details
          : result.error || 'Failed to create Drawing Down transaction'
        setError(errorMessage)
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Error creating Drawing Down transaction:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Dialog open={true} onClose={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading Drawing Down system...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onClose={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-blue-800">
            🎯 Drawing Down Transaction
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Record billable transaction at point of service. All fields are mandatory for NDIS compliance.
          </p>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Hidden fields for Drawing Down */}
          <input type="hidden" {...form.register('serviceCode')} />
          <input type="hidden" {...form.register('isDrawdownTransaction')} />
          
          {/* Participant Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Participant * <span className="text-red-500">(Required for NDIS)</span>
              </label>
              <select
                {...form.register('residentId')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select participant</option>
                {residents.map(resident => (
                  <option key={resident.id} value={resident.id}>
                    {resident.firstName} {resident.lastName} ({resident.id})
                  </option>
                ))}
              </select>
              {form.formState.errors.residentId && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.residentId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Support Agreement * <span className="text-red-500">(Required for NDIS)</span>
              </label>
              <select
                {...form.register('contractId')}
                onChange={(e) => {
                  form.setValue('contractId', e.target.value)
                  handleContractChange(e.target.value)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedResident}
              >
                <option value="">Select support agreement</option>
                {selectedResident?.fundingInformation
                  ?.filter((contract: any) => contract.contractStatus !== 'Voided')
                  ?.map((contract: any) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.type} - ${(contract.originalAmount || contract.amount || 0).toLocaleString()} 
                      (Balance: ${(contract.currentBalance || contract.amount || 0).toLocaleString()})
                    </option>
                  ))}
              </select>
              {form.formState.errors.contractId && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.contractId.message}</p>
              )}
            </div>
          </div>

          {/* Contract Details Display */}
          {selectedContractInfo && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Support Agreement Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span> {selectedContractInfo.type}
                </div>
                <div>
                  <span className="font-medium">Status:</span> 
                  <span className={`ml-1 px-2 py-1 rounded text-xs ${
                    (selectedContractInfo.contractStatus || 'Draft') === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedContractInfo.contractStatus || 'Draft'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Original Amount:</span> ${(selectedContractInfo.originalAmount || selectedContractInfo.amount || 0).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Current Balance:</span> ${(selectedContractInfo.currentBalance || selectedContractInfo.amount || 0).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Service Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NDIS Service Item Code * <span className="text-red-500">(Required for NDIS)</span>
              </label>
              <select
                {...form.register('serviceItemCode')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select service item code</option>
                {COMMON_SERVICE_CODES.map(service => (
                  <option key={service.code} value={service.code}>
                    {service.code} - {service.label}
                  </option>
                ))}
              </select>
              {form.formState.errors.serviceItemCode && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.serviceItemCode.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Date * <span className="text-red-500">(Required for NDIS)</span>
              </label>
              <Input
                type="datetime-local"
                {...form.register('occurredAt')}
                className="w-full"
              />
              {form.formState.errors.occurredAt && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.occurredAt.message}</p>
              )}
            </div>
          </div>

          {/* Service Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specific Support Description * <span className="text-red-500">(Required for NDIS)</span>
            </label>
            <textarea
              {...form.register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the specific support provided at this point in time..."
            />
            {form.formState.errors.description && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* Quantity and Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity * <span className="text-red-500">(Required for NDIS)</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                {...form.register('quantity', { valueAsNumber: true })}
                className="w-full"
              />
              {form.formState.errors.quantity && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.quantity.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Price * <span className="text-red-500">(Required for NDIS)</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...form.register('unitPrice', { valueAsNumber: true })}
                className="w-full"
              />
              {form.formState.errors.unitPrice && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.unitPrice.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Amount * <span className="text-red-500">(Required for NDIS)</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                {...form.register('amount', { valueAsNumber: true })}
                className="w-full"
                readOnly
              />
              {form.formState.errors.amount && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.amount.message}</p>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              {...form.register('note')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional notes about this transaction..."
            />
          </div>

          {/* Validation Results */}
          {validationResult && (
            <div className={`p-4 rounded-lg border ${
              validationResult.isValid 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <h4 className={`font-semibold mb-2 ${
                validationResult.isValid ? 'text-green-800' : 'text-red-800'
              }`}>
                {validationResult.isValid ? '✅ Validation Passed' : '❌ Validation Failed'}
              </h4>
              
              {validationResult.errors.length > 0 && (
                <div className="mb-2">
                  <p className="text-sm font-medium text-red-700 mb-1">Errors:</p>
                  <ul className="text-sm text-red-600 list-disc list-inside">
                    {validationResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {validationResult.warnings.length > 0 && (
                <div className="mb-2">
                  <p className="text-sm font-medium text-yellow-700 mb-1">Warnings:</p>
                  <ul className="text-sm text-yellow-600 list-disc list-inside">
                    {validationResult.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {validationResult.balanceImpact && (
                <div className="text-sm">
                  <p className="font-medium text-gray-700 mb-1">Balance Impact:</p>
                  <div className="space-y-1">
                    <p className="text-gray-600">
                      Current Balance: ${validationResult.balanceImpact.currentBalance.toLocaleString()}
                    </p>
                    <p className="text-gray-600">
                      Transaction Amount: ${validationResult.balanceImpact.impactAmount.toLocaleString()}
                    </p>
                    <p className="text-gray-600">
                      Remaining After Post: ${validationResult.balanceImpact.newBalance.toLocaleString()}
                    </p>
                    {!validationResult.balanceImpact.isValid && (
                      <p className="text-red-600 font-medium">
                        ⚠️ {validationResult.balanceImpact.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              intent="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !validationResult?.canProceed}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Creating Transaction...' : 'Create Drawing Down Transaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
