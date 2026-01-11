
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
import { createTransaction } from "lib/utils/transaction-storage"
import type { FundingInformation } from "types/resident"
import type { TransactionCreateInput } from "types/transaction"

// Form schema - enhanced for Drawing Down mode
const createTransactionSchema = z.object({
  residentId: z.string().min(1, "Please select a resident"),
  contractId: z.string().min(1, "Please select a contract"),
  occurredAt: z.coerce.date(),
  serviceCode: z.string().optional(),
  serviceItemCode: z.string().optional(), // Required for Drawing Down mode
  note: z.string().optional(), // Renamed from description for consistency
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().nonnegative("Unit price must be non-negative"),
  amount: z.number().nonnegative().optional(),
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
  const [residents, setResidents] = useState<any[]>([])
  const [houses, setHouses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedContractInfo, setSelectedContractInfo] = useState<any>(null)
  const [dateConstraints, setDateConstraints] = useState<{
    minDate: string | null
    maxDate: string | null
  }>({ minDate: null, maxDate: null })
  const [isDateOutOfBounds, setIsDateOutOfBounds] = useState(false)
  const [dateWarning, setDateWarning] = useState<string | null>(null)

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

  // Function to filter residents based on eligibility criteria
  const filterEligibleResidents = async (allResidents: any[], houses: any[]) => {
    const eligibleResidents = []
    
    console.log(`🔍 Filtering ${allResidents.length} residents for transaction eligibility...`)
    
    for (const resident of allResidents) {
      console.log(`\n👤 Checking resident: ${resident.firstName} ${resident.lastName} (ID: ${resident.id})`)
      
      // Check if resident has active status
      if (resident.status !== 'Active') {
        console.log(`❌ Filtered out - Status: ${resident.status} (required: Active)`)
        continue
      }
      console.log(`✅ Status check passed: ${resident.status}`)
      
      // Check if resident is assigned to a house
      if (!resident.houseId) {
        console.log(`❌ Filtered out - No house assignment`)
        continue
      }
      console.log(`✅ House assignment check passed: ${resident.houseId}`)
      
      // Verify the house exists
      const house = houses.find(h => h.id === resident.houseId)
      if (!house) {
        console.log(`❌ Filtered out - House not found for ID: ${resident.houseId}`)
        continue
      }
      console.log(`✅ House found: ${house.descriptor || house.address1}`)
      
      // Check if resident has at least one active contract with money and valid date range
      try {
        const response = await fetch(`/api/residents/${resident.id}/funding`)
        const result = await response.json() as { success: boolean; data?: any[] }
        
        if (result.success && result.data) {
          console.log(`📋 Found ${result.data.length} contracts for ${resident.firstName} ${resident.lastName}`)
          
          const now = new Date()
          const eligibleContracts = result.data.filter((contract: any, index: number) => {
            console.log(`\n  📄 Contract ${index + 1}: ${contract.type || 'Unknown Type'}`)
            console.log(`     Status: ${contract.contractStatus}`)
            console.log(`     Current Balance: $${contract.currentBalance || 0}`)
            console.log(`     Start Date: ${contract.startDate || 'None'}`)
            console.log(`     End Date: ${contract.endDate || 'None'}`)
            
            // Must be active
            if (contract.contractStatus !== 'Active') {
              console.log(`     ❌ Not eligible - Status is ${contract.contractStatus}, need Active`)
              return false
            }
            
            // Must have money (current balance > 0)
            if (!contract.currentBalance || contract.currentBalance <= 0) {
              console.log(`     ❌ Not eligible - No money (balance: $${contract.currentBalance || 0})`)
              return false
            }
            
            // Must be within date range (if end date exists)
            if (contract.endDate) {
              const endDate = new Date(contract.endDate)
              if (endDate < now) {
                console.log(`     ❌ Not eligible - Contract expired (end date: ${contract.endDate})`)
                return false
              }
            }
            
            // Must have started (if start date exists)
            if (contract.startDate) {
              const startDate = new Date(contract.startDate)
              if (startDate > now) {
                console.log(`     ❌ Not eligible - Contract not started yet (start date: ${contract.startDate})`)
                return false
              }
            }
            
            console.log(`     ✅ Contract is eligible!`)
            return true
          })
          
          if (eligibleContracts.length > 0) {
            console.log(`🎉 Resident ${resident.firstName} ${resident.lastName} is ELIGIBLE - has ${eligibleContracts.length} active contracts with money within date range`)
            eligibleResidents.push({
              ...resident,
              house: house // Add house info for easier access
            })
          } else {
            console.log(`❌ Resident ${resident.firstName} ${resident.lastName} filtered out - no eligible contracts (active + money + within date range)`)
          }
        } else {
          console.log(`❌ Resident ${resident.firstName} ${resident.lastName} filtered out - no funding data (API call failed or no data)`)
        }
      } catch (error) {
        console.error(`Error checking contracts for resident ${resident.id}:`, error)
        // Fallback to localStorage check
        if (resident.fundingInformation && resident.fundingInformation.length > 0) {
          const now = new Date()
          const eligibleContracts = resident.fundingInformation.filter((contract: any) => {
            // Must be active
            if (contract.contractStatus !== 'Active') return false
            
            // Must have money (current balance > 0)
            if (!contract.currentBalance || contract.currentBalance <= 0) return false
            
            // Must be within date range (if end date exists)
            if (contract.endDate) {
              const endDate = new Date(contract.endDate)
              if (endDate < now) return false
            }
            
            // Must have started (if start date exists)
            if (contract.startDate) {
              const startDate = new Date(contract.startDate)
              if (startDate > now) return false
            }
            
            return true
          })
          
          if (eligibleContracts.length > 0) {
            console.log(`Resident ${resident.firstName} ${resident.lastName} is eligible (fallback) - has ${eligibleContracts.length} eligible contracts`)
            eligibleResidents.push({
              ...resident,
              house: house
            })
          }
        }
      }
    }
    
    console.log(`\n🎯 FILTERING SUMMARY:`)
    console.log(`📊 Total residents checked: ${allResidents.length}`)
    console.log(`✅ Eligible residents found: ${eligibleResidents.length}`)
    console.log(`📝 Eligible residents: ${eligibleResidents.map(r => `${r.firstName} ${r.lastName}`).join(', ')}`)
    
    return eligibleResidents
  }

  // Fetch residents and houses from API with smart filtering
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [residentsResponse, housesResponse] = await Promise.all([
          fetch('/api/residents'),
          fetch('/api/houses?limit=1000') // Get ALL houses, not just first 10
        ])
        
        const residentsData = await residentsResponse.json() as { success: boolean; data?: any[] }
        const housesData = await housesResponse.json() as { success: boolean; data?: any[] }
        
        if (residentsData.success && housesData.success) {
          console.log('Raw residents loaded:', residentsData.data)
          console.log('All houses loaded (should be all houses, not just first 10):', housesData.data)
          
          // Filter residents to only show those who:
          // 1. Have active status
          // 2. Are assigned to a house
          // 3. Have at least one active contract with money and valid date range
          const eligibleResidents = await filterEligibleResidents(residentsData.data || [], housesData.data || [])
          console.log('Eligible residents for transactions:', eligibleResidents)
          
          setResidents(eligibleResidents)
          setHouses(housesData.data || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        // Fallback to localStorage with same filtering logic
        try {
          const allResidents = getResidentsFromStorage()
          const allHouses = getHousesFromStorage()
          console.log('Fallback - All residents from localStorage:', allResidents)
          console.log('Fallback - All houses from localStorage:', allHouses)
          
          const eligibleResidents = await filterEligibleResidents(allResidents, allHouses)
          console.log('Fallback - Eligible residents:', eligibleResidents)
          
          setResidents(eligibleResidents)
          setHouses(allHouses)
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
          const result = await response.json() as { success: boolean; data?: any[] }
          
          if (result.success && result.data) {
            setFundingContracts(prev => ({
              ...prev,
              [watchedValues.residentId]: result.data || []
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

  // Reset contract when resident changes
  useEffect(() => {
    form.setValue('contractId', '')
    setSelectedContractInfo(null)
    setDateConstraints({ minDate: null, maxDate: null })
    setIsDateOutOfBounds(false)
    setDateWarning(null)
  }, [watchedValues.residentId, form])

  // Watch for date changes and validate against contract boundaries
  useEffect(() => {
    if (watchedValues.occurredAt && selectedContractInfo) {
      checkDateBounds(watchedValues.occurredAt, selectedContractInfo)
    }
  }, [watchedValues.occurredAt, selectedContractInfo])

  // Handle contract selection to show contract details and set date constraints
  const handleContractChange = (contractId: string) => {
    if (selectedResident && contractId) {
      const contract = selectedResidentContracts.find((c: any) => c.id === contractId)
      setSelectedContractInfo(contract)
      
      // Set date constraints based on contract dates
      if (contract) {
        // Convert to local date format (YYYY-MM-DD) for HTML date input
        const minDate = contract.startDate ? new Date(contract.startDate).toLocaleDateString('en-CA') : null
        const maxDate = contract.endDate ? new Date(contract.endDate).toLocaleDateString('en-CA') : null
        
        setDateConstraints({ 
          minDate: minDate || null, 
          maxDate: maxDate || null 
        })
        
        // Check if current date is out of bounds
        const currentDate = form.getValues('occurredAt')
        if (currentDate) {
          checkDateBounds(currentDate, contract)
        }
      } else {
        setDateConstraints({ minDate: null, maxDate: null })
        setIsDateOutOfBounds(false)
        setDateWarning(null)
      }
    } else {
      setSelectedContractInfo(null)
      setDateConstraints({ minDate: null, maxDate: null })
      setIsDateOutOfBounds(false)
      setDateWarning(null)
    }
  }
  
  // Check if selected date is within contract boundaries
  const checkDateBounds = (selectedDate: Date, contract: any) => {
    const contractStart = contract.startDate ? new Date(contract.startDate) : null
    const contractEnd = contract.endDate ? new Date(contract.endDate) : null
    
    let isOutOfBounds = false
    let warning = null
    
    if (contractStart && selectedDate < contractStart) {
      isOutOfBounds = true
      warning = `Transaction date is before contract start date (${contractStart.toLocaleDateString()}). This will create an orphaned transaction that won't draw down from the contract.`
    } else if (contractEnd && selectedDate > contractEnd) {
      isOutOfBounds = true
      warning = `Transaction date is after contract end date (${contractEnd.toLocaleDateString()}). This will create an orphaned transaction that won't draw down from the contract.`
    }
    
    setIsDateOutOfBounds(isOutOfBounds)
    setDateWarning(warning)
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
        amount: calculatedAmount,
        // Ensure serviceCode is defined if provided
        serviceCode: data.serviceCode || '',
        // Pass the orphaned status from frontend validation
        isOrphaned: isDateOutOfBounds
      }

      // Create transaction using API
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input)
      })

      const result = await response.json() as { success: boolean; data?: any; error?: string }

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create transaction')
      }

      console.log('Created transaction:', result.data)
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
        <DialogContent>
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
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
                min={dateConstraints.minDate || undefined}
                max={dateConstraints.maxDate || undefined}
              />
              
              {/* Contract Date Range Display */}
              {selectedContractInfo && (selectedContractInfo.startDate || selectedContractInfo.endDate) && (
                <div className="text-sm text-gray-600">
                  <p className="font-medium">Contract Date Range:</p>
                  <p>
                    {selectedContractInfo.startDate 
                      ? `From: ${new Date(selectedContractInfo.startDate).toLocaleDateString()}`
                      : 'From: No start date'
                    }
                    {selectedContractInfo.endDate 
                      ? ` To: ${new Date(selectedContractInfo.endDate).toLocaleDateString()}`
                      : ' To: Ongoing (no end date)'
                    }
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Date picker constraints: min={dateConstraints.minDate || 'none'}, max={dateConstraints.maxDate || 'none'}
                  </p>
                </div>
              )}
              
              {/* Date Out of Bounds Warning */}
              {isDateOutOfBounds && dateWarning && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-800">
                        {dateWarning}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Service Code */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Service Code
              </label>
              <Input
                {...form.register('serviceCode')}
                placeholder="e.g., SDA_RENT, SIL_SUPPORT, CORE_SUPPORT, CAPACITY_BUILDING"
                error={form.formState.errors.serviceCode?.message}
              />
              <p className="text-xs text-gray-500">
                Examples: SDA_RENT, SIL_SUPPORT, CORE_SUPPORT, CAPACITY_BUILDING, TRANSPORT, EQUIPMENT, THERAPY, RESPITE
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
                  {...form.register('note')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the specific support provided at this point in time for NDIS compliance..."
                  required={mode === 'drawdown'}
                />
                {form.formState.errors.note && (
                  <p className="text-red-500 text-sm">{form.formState.errors.note.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  Must describe specific support provided for NDIS audit trail
                </p>
              </div>
            </div>
          )}

          {/* Description - Only show for regular transactions, not drawing down */}
          {mode !== 'drawdown' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Note
              </label>
              <textarea
                {...form.register('note')}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of the service provided..."
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quantity */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Quantity *
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="1"
                  min="1"
                  {...form.register('quantity', { valueAsNumber: true })}
                  error={form.formState.errors.quantity?.message}
                  className="flex-1"
                />
                <div className="flex flex-col gap-1">
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
              <label className="block text-sm font-medium text-gray-700">
                Unit Price *
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register('unitPrice', { valueAsNumber: true })}
                    error={form.formState.errors.unitPrice?.message}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const currentValue = form.getValues('unitPrice') || 0
                      form.setValue('unitPrice', Math.round((currentValue + 1) * 100) / 100)
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Increase by $1"
                  >
                    +$1
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const currentValue = form.getValues('unitPrice') || 0
                      form.setValue('unitPrice', Math.max(0, Math.round((currentValue - 1) * 100) / 100))
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Decrease by $1"
                  >
                    -$1
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Supports cents (e.g., $123.45). Use +/- for $1 increments
              </p>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Amount *
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('amount', { valueAsNumber: true })}
                  error={form.formState.errors.amount?.message}
                  className="flex-1"
                />
                <div className="flex flex-col gap-1">
                  <div className="px-2 py-1 text-sm bg-gray-50 rounded border text-gray-400">
                    Auto
                  </div>
                  <div className="px-2 py-1 text-sm bg-gray-50 rounded border text-gray-400">
                    Calc
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Auto-calculated from quantity × unit price
              </p>
            </div>
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