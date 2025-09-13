
"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "components/Button/Button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "components/ui/Dialog"
import { Input } from "components/ui/Input"
import { getHousesFromStorage } from "lib/utils/house-storage"
import { getResidentsFromStorage } from "lib/utils/resident-storage"
import { createTransaction, getTransactionBalancePreview } from "lib/utils/transaction-storage"
import type { FundingInformation } from "types/resident"
import type { TransactionBalancePreview, TransactionCreateInput } from "types/transaction"

// Form schema - enhanced for Drawing Down mode
const createTransactionSchema = z.object({
  residentId: z.string().min(1, "Please select a resident"),
  contractId: z.string().min(1, "Please select a contract"),
  occurredAt: z.coerce.date(),
  serviceCode: z.string().min(1, "Service code is required"),
  serviceItemCode: z.string().optional(), // Required for Drawing Down mode
  description: z.string().optional(),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().nonnegative("Unit price must be non-negative"),
  amount: z.number().nonnegative().optional(),
  note: z.string().optional(),
  supportAgreementId: z.string().optional(),
  isDrawdownTransaction: z.boolean().optional()
})

type FormData = z.infer<typeof createTransactionSchema>

interface CreateTransactionDialogProps {
  onClose: () => void
  onSuccess: () => void
  mode?: 'standard' | 'drawdown' // New prop to enable Drawing Down mode
}

export function CreateTransactionDialog({ onClose, onSuccess, mode = 'standard' }: CreateTransactionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balancePreview, setBalancePreview] = useState<TransactionBalancePreview | null>(null)
  const [residents, setResidents] = useState<any[]>([])
  const [houses, setHouses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedContractInfo, setSelectedContractInfo] = useState<any>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      occurredAt: new Date(),
      quantity: 1,
      unitPrice: 0,
      isDrawdownTransaction: mode === 'drawdown',
      serviceItemCode: mode === 'drawdown' ? '' : undefined,
      serviceCode: mode === 'drawdown' ? 'DRAWDOWN' : ''
    }
  })

  // Fetch residents and houses from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [residentsResponse, housesResponse] = await Promise.all([
          fetch('/api/residents'),
          fetch('/api/houses')
        ])
        
        const residentsData = await residentsResponse.json()
        const housesData = await housesResponse.json()
        
        if (residentsData.success) {
          console.log('Residents loaded:', residentsData.data)
          setResidents(residentsData.data)
        }
        if (housesData.success) {
          console.log('Houses loaded:', housesData.data)
          setHouses(housesData.data)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        // Fallback to localStorage
        try {
          const residents = getResidentsFromStorage()
          const houses = getHousesFromStorage()
          console.log('Fallback - Residents from localStorage:', residents)
          console.log('Fallback - Houses from localStorage:', houses)
          setResidents(residents)
          setHouses(houses)
        } catch (localError) {
          console.error('Error with localStorage fallback:', localError)
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [])

  const [fundingContracts, setFundingContracts] = useState<Record<string, FundingInformation[]>>({})

  const watchedValues = form.watch()
  const selectedResident = residents.find(r => r.id === watchedValues.residentId)
  const selectedResidentContracts = selectedResident ? fundingContracts[selectedResident.id] || [] : []
  const selectedContract = selectedResidentContracts.find(c => c.id === watchedValues.contractId)

  // Get available contracts for selected resident (only active contracts)
  const availableContracts = selectedResidentContracts.filter(c => c.contractStatus === 'Active') || []

  // Load funding contracts when resident is selected
  useEffect(() => {
    if (watchedValues.residentId && !fundingContracts[watchedValues.residentId]) {
      const loadFundingContracts = async () => {
        try {
          const response = await fetch(`/api/residents/${watchedValues.residentId}/funding`)
          const result = await response.json()
          
          if (result.success && result.data) {
            setFundingContracts(prev => ({
              ...prev,
              [watchedValues.residentId]: result.data
            }))
          }
        } catch (error) {
          console.error('Error loading funding contracts:', error)
        }
      }
      
      loadFundingContracts()
    }
  }, [watchedValues.residentId, fundingContracts])

  // Calculate amount when quantity or unit price changes
  useEffect(() => {
    if (watchedValues.quantity && watchedValues.unitPrice) {
      const calculatedAmount = watchedValues.quantity * watchedValues.unitPrice
      form.setValue('amount', calculatedAmount)
    }
  }, [watchedValues.quantity, watchedValues.unitPrice, form])

  // Update balance preview when contract or amount changes
  useEffect(() => {
    if (watchedValues.contractId && watchedValues.amount) {
      try {
        const preview = getTransactionBalancePreview(watchedValues.contractId, watchedValues.amount)
        setBalancePreview(preview)
      } catch (err) {
        setBalancePreview(null)
      }
    } else {
      setBalancePreview(null)
    }
  }, [watchedValues.contractId, watchedValues.amount])

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

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Ensure amount is calculated if not provided
      const calculatedAmount = data.amount || (data.quantity * data.unitPrice)
      
      const input: TransactionCreateInput = {
        ...data,
        // Ensure date is properly formatted
        occurredAt: data.occurredAt instanceof Date ? data.occurredAt : new Date(data.occurredAt),
        amount: calculatedAmount
      }

      // Create transaction using client-side function
      const transaction = createTransaction(input, 'current-user')
      
      console.log('Created transaction:', transaction)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transaction')
      console.error('Error creating transaction:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const residentHouse = selectedResident ? houses.find(h => h.id === selectedResident.houseId) : null

  if (isLoading) {
    return (
      <Dialog open={true} onClose={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Transaction</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading residents and houses...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onClose={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={mode === 'drawdown' ? 'text-xl font-bold text-blue-800' : ''}>
            {mode === 'drawdown' ? '🎯 Drawing Down Transaction' : 'Create Transaction'}
          </DialogTitle>
          {mode === 'drawdown' && (
            <p className="text-sm text-gray-600">
              Record billable transaction at point of service. All fields are mandatory for NDIS compliance.
            </p>
          )}
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Resident Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Resident *
            </label>
            <select
              {...form.register('residentId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a resident...</option>
              {residents.map(resident => {
                const house = houses.find(h => h.id === resident.houseId)
                return (
                  <option key={resident.id} value={resident.id}>
                    {resident.firstName} {resident.lastName} - {house?.address1 || 'Unknown House'}
                  </option>
                )
              })}
            </select>
            {form.formState.errors.residentId && (
              <p className="text-red-600 text-sm">{form.formState.errors.residentId.message}</p>
            )}
          </div>

          {/* Contract Selection */}
          {selectedResident && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Contract *
              </label>
              {availableContracts.length > 0 ? (
                <select
                  {...form.register('contractId')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    form.setValue('contractId', e.target.value)
                    handleContractChange(e.target.value)
                  }}
                >
                  <option value="">Select a contract...</option>
                  {availableContracts.map(contract => (
                    <option key={contract.id} value={contract.id}>
                      {contract.type} - ${contract.currentBalance.toLocaleString()} remaining
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    No active contracts available for this resident.
                  </p>
                </div>
              )}
              {form.formState.errors.contractId && (
                <p className="text-red-600 text-sm">{form.formState.errors.contractId.message}</p>
              )}
            </div>
          )}

          {/* Contract Information Display */}
          {selectedContractInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Contract Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Start Date:</span>
                  <p className="text-blue-900">
                    {selectedContractInfo.startDate ? new Date(selectedContractInfo.startDate).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">End Date:</span>
                  <p className="text-blue-900">
                    {selectedContractInfo.endDate ? new Date(selectedContractInfo.endDate).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Support Item Code:</span>
                  <p className="text-blue-900">
                    {selectedContractInfo.supportItemCode || 'Not configured'}
                  </p>
                </div>
              </div>
              <p className="text-blue-800 text-sm mt-2">
                This contract starts on {selectedContractInfo.startDate ? new Date(selectedContractInfo.startDate).toLocaleDateString() : 'TBD'} & ends on {selectedContractInfo.endDate ? new Date(selectedContractInfo.endDate).toLocaleDateString() : 'TBD'} and is configured for servicing items code {selectedContractInfo.supportItemCode || 'TBD'}
              </p>
            </div>
          )}

          {/* Resident & Contract Info Display */}
          {selectedResident && residentHouse && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Resident:</span>
                  <p className="font-medium">{selectedResident.firstName} {selectedResident.lastName}</p>
                </div>
                <div>
                  <span className="text-gray-500">House:</span>
                  <p className="font-medium">{residentHouse.address1}</p>
                </div>
                {selectedContract && (
                  <>
                    <div>
                      <span className="text-gray-500">Contract:</span>
                      <p className="font-medium">{selectedContract.type}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Available Balance:</span>
                      <p className="font-medium text-green-600">
                        ${selectedContract.currentBalance.toLocaleString()}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Occurred Date */}
            <div className="space-y-2">
              <Input
                label="Date of Delivery *"
                type="date"
                {...form.register('occurredAt')}
                error={form.formState.errors.occurredAt?.message}
              />
            </div>

            {/* Service Code */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Service Code *
              </label>
              <select
                {...form.register('serviceCode')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a service code...</option>
                <option value="SDA_RENT">SDA_RENT - Specialist Disability Accommodation rental</option>
                <option value="SIL_SUPPORT">SIL_SUPPORT - Supported Independent Living hours</option>
                <option value="CORE_SUPPORT">CORE_SUPPORT - Core supports and services</option>
                <option value="CAPACITY_BUILDING">CAPACITY_BUILDING - Capacity building supports</option>
                <option value="TRANSPORT">TRANSPORT - Transportation assistance</option>
                <option value="EQUIPMENT">EQUIPMENT - Assistive technology and equipment</option>
                <option value="THERAPY">THERAPY - Allied health and therapy services</option>
                <option value="RESPITE">RESPITE - Short-term accommodation and respite</option>
                <option value="OTHER">OTHER - Other approved NDIS services</option>
              </select>
              {form.formState.errors.serviceCode && (
                <p className="text-red-600 text-sm">{form.formState.errors.serviceCode.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Required: Select a service code for this transaction
              </p>
            </div>
          </div>

          {/* Drawing Down Specific Fields */}
          {mode === 'drawdown' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-4">🎯 NDIS Drawing Down Requirements</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* NDIS Service Item Code */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    NDIS Service Item Code * <span className="text-red-500">(Required for NDIS)</span>
                  </label>
                  <select
                    {...form.register('serviceItemCode')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={mode === 'drawdown'}
                  >
                    <option value="">Select NDIS service item code</option>
                    <option value="01_001_0107_1_1">01_001_0107_1_1 - SDA Rent</option>
                    <option value="01_001_0108_1_1">01_001_0108_1_1 - SIL Support</option>
                    <option value="01_001_0109_1_1">01_001_0109_1_1 - Core Support</option>
                    <option value="01_001_0110_1_1">01_001_0110_1_1 - Capacity Building</option>
                    <option value="01_001_0111_1_1">01_001_0111_1_1 - Transport</option>
                    <option value="01_001_0112_1_1">01_001_0112_1_1 - Equipment</option>
                    <option value="01_001_0113_1_1">01_001_0113_1_1 - Therapy</option>
                    <option value="01_001_0114_1_1">01_001_0114_1_1 - Respite</option>
                  </select>
                  {form.formState.errors.serviceItemCode && (
                    <p className="text-red-500 text-sm">{form.formState.errors.serviceItemCode.message}</p>
                  )}
                </div>

                {/* Support Agreement ID */}
                <div className="space-y-2">
                  <Input
                    label="Support Agreement ID"
                    type="text"
                    {...form.register('supportAgreementId')}
                    placeholder="e.g., SA-2024-001"
                    error={form.formState.errors.supportAgreementId?.message}
                  />
                  <p className="text-xs text-gray-500">
                    Optional: Link to specific support agreement
                  </p>
                </div>
              </div>

              {/* Enhanced Description for Drawing Down */}
              <div className="mt-4 space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Specific Support Description * <span className="text-red-500">(Required for NDIS)</span>
                </label>
                <textarea
                  {...form.register('description')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the specific support provided at this point in time for NDIS compliance..."
                  required={mode === 'drawdown'}
                />
                {form.formState.errors.description && (
                  <p className="text-red-500 text-sm">{form.formState.errors.description.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  Must describe specific support provided for NDIS audit trail
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              {...form.register('description')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the service provided..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Quantity */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  label="Quantity *"
                  type="number"
                  step="1"
                  min="1"
                  {...form.register('quantity', { valueAsNumber: true })}
                  error={form.formState.errors.quantity?.message}
                  className="flex-1"
                />
                <div className="flex flex-col gap-1 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      const current = form.getValues('quantity') || 1
                      form.setValue('quantity', Math.max(1, current + 1))
                    }}
                    className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const current = form.getValues('quantity') || 1
                      form.setValue('quantity', Math.max(1, current - 1))
                    }}
                    className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
                  >
                    -
                  </button>
                </div>
              </div>
            </div>

            {/* Unit Price */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  label="Unit Price *"
                  type="number"
                  step="10"
                  min="0"
                  {...form.register('unitPrice', { valueAsNumber: true })}
                  error={form.formState.errors.unitPrice?.message}
                  className="flex-1"
                />
                <div className="flex flex-col gap-1 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      const currentValue = form.getValues('unitPrice') || 0
                      form.setValue('unitPrice', currentValue + 10)
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Increase by $10"
                  >
                    +$10
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const currentValue = form.getValues('unitPrice') || 0
                      form.setValue('unitPrice', Math.max(0, currentValue - 10))
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Decrease by $10"
                  >
                    -$10
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Use +/- buttons for $10 increments
              </p>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Input
                label="Amount *"
                type="number"
                step="0.01"
                min="0"
                {...form.register('amount', { valueAsNumber: true })}
                error={form.formState.errors.amount?.message}
              />
              <p className="text-xs text-gray-500">
                Auto-calculated from quantity × unit price
              </p>
            </div>
          </div>

          {/* Balance Preview */}
          {balancePreview && (
            <div className={`p-4 rounded-lg border ${
              balancePreview.canPost 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <h4 className={`font-medium ${
                balancePreview.canPost ? 'text-green-800' : 'text-red-800'
              }`}>
                Balance Preview
              </h4>
              <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Current Balance:</span>
                  <p className="font-medium">${balancePreview.currentBalance.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Transaction Amount:</span>
                  <p className="font-medium">${balancePreview.transactionAmount.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Remaining After Post:</span>
                  <p className={`font-medium ${
                    balancePreview.canPost ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${balancePreview.remainingAfterPost.toFixed(2)}
                  </p>
                </div>
              </div>
              {balancePreview.warningMessage && (
                <p className="mt-2 text-sm text-red-600">
                  ⚠️ {balancePreview.warningMessage}
                </p>
              )}
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Note
            </label>
            <textarea
              {...form.register('note')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes or comments..."
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={mode === 'drawdown' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700'}
            >
              {isSubmitting 
                ? (mode === 'drawdown' ? 'Creating Drawing Down Transaction...' : 'Creating...') 
                : (mode === 'drawdown' ? 'Create Drawing Down Transaction' : 'Create Transaction')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}