
"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "components/Button/Button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "components/ui/Dialog"
import { Input } from "components/ui/Input"
import type { FundingInformation } from "types/resident"
import type { TransactionCreateInput } from "types/transaction"

// Form schema
const createTransactionSchema = z.object({
  residentId: z.string().min(1, "Please select a resident"),
  contractId: z.string().min(1, "Please select a contract"),
  occurredAt: z.coerce.date(),
  serviceCode: z.string().optional(),
  serviceItemCode: z.string().optional(),
  note: z.string().optional(),
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
  mode?: 'standard' | 'drawdown'
}

/**
 * Helper: wraps onSuccess so that during "Create & Next" we do NOT
 * trigger the parent's onSuccess (which closes the dialog).
 * Instead we track that at least one transaction was created and
 * call onSuccess when the user finally closes or does a normal create.
 */

/* ── Helpers for End-of-Month logic ── */
/** Returns the number of days in a given month (1-based month) */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** Returns the last day of the month for a given date */
function lastDayOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

/** Advances a date to the last day of the next month */
function advanceToNextMonthEnd(d: Date): Date {
  const next = new Date(d.getFullYear(), d.getMonth() + 2, 0) // last day of next month
  return next
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
  // Track which field the user last edited so we can derive the others
  const [lastEditedField, setLastEditedField] = useState<'quantity' | 'unitPrice' | 'amount' | null>(null)
  // End-of-month roll-up mode
  const [endOfMonthMode, setEndOfMonthMode] = useState(false)
  const [createCount, setCreateCount] = useState(0) // how many created in this session
  // Transition state for Create & Next animation
  const [transitioning, setTransitioning] = useState(false)
  const [transitionLabel, setTransitionLabel] = useState('')

  const form = useForm<FormData>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      occurredAt: new Date(),
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      isDrawdownTransaction: mode === 'drawdown',
      serviceItemCode: mode === 'drawdown' ? '' : undefined,
      serviceCode: mode === 'drawdown' ? 'DRAWDOWN' : ''
    }
  })

  /**
   * Filter residents client-side using the funding_contracts data
   * already included in the /api/residents response.
   */
  const filterEligibleResidents = (allResidents: any[], allHouses: any[]) => {
    return allResidents.filter((resident) => {
      if (resident.status !== 'Active') return false
      if (!resident.houseId) return false
      const house = allHouses.find((h: any) => h.id === resident.houseId)
      if (!house) return false
      const contracts = resident.funding_contracts || []
      return contracts.some((c: any) =>
        c.contract_status === 'Active' && c.current_balance > 0
      )
    }).map((resident: any) => ({
              ...resident,
      house: allHouses.find((h: any) => h.id === resident.houseId),
    }))
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [residentsResponse, housesResponse] = await Promise.all([
          fetch('/api/residents?limit=100'),
          fetch('/api/houses?limit=100'),
        ])
        const residentsData = await residentsResponse.json() as { success: boolean; data?: any[] }
        const housesData = await housesResponse.json() as { success: boolean; data?: any[] }
        if (residentsData.success && housesData.success) {
          setResidents(filterEligibleResidents(residentsData.data || [], housesData.data || []))
          setHouses(housesData.data || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const [fundingContracts, setFundingContracts] = useState<Record<string, FundingInformation[]>>({})

  const watchedResidentId = form.watch('residentId')
  const watchedContractId = form.watch('contractId')
  const watchedQuantity = form.watch('quantity')
  const watchedUnitPrice = form.watch('unitPrice')
  const watchedAmount = form.watch('amount')
  const watchedOccurredAt = form.watch('occurredAt')

  const selectedResident = useMemo(
    () => residents.find(r => r.id === watchedResidentId),
    [residents, watchedResidentId]
  )
  const selectedResidentContracts = selectedResident ? fundingContracts[selectedResident.id] || [] : []
  const selectedContract = selectedResidentContracts.find(c => c.id === watchedContractId)
  const availableContracts = selectedResidentContracts.filter(c => c.contractStatus === 'Active') || []

  // Load full funding contracts when a resident is selected
  useEffect(() => {
    if (watchedResidentId && !fundingContracts[watchedResidentId]) {
      const loadFundingContracts = async () => {
        try {
          const response = await fetch(`/api/residents/${watchedResidentId}/funding`)
          const result = await response.json() as { success: boolean; data?: any[] }
          if (result.success && result.data) {
            setFundingContracts(prev => ({
              ...prev,
              [watchedResidentId]: result.data || []
            }))
          }
        } catch (error) {
          console.error('Error loading funding contracts:', error)
        }
      }
      loadFundingContracts()
    }
  }, [watchedResidentId, fundingContracts])

  // Smart amount derivation logic:
  // - If user edits quantity or unitPrice → amount = qty × unitPrice
  // - If user edits amount directly → set qty=1, unitPrice=amount
  useEffect(() => {
    if (lastEditedField === 'quantity' || lastEditedField === 'unitPrice') {
      const qty = watchedQuantity || 0
      const price = watchedUnitPrice || 0
      const calc = Math.round(qty * price * 100) / 100
      form.setValue('amount', calc, { shouldValidate: false })
    }
  }, [watchedQuantity, watchedUnitPrice, lastEditedField, form])

  useEffect(() => {
    if (lastEditedField === 'amount') {
      const amt = watchedAmount || 0
      form.setValue('quantity', 1, { shouldValidate: false })
      form.setValue('unitPrice', amt, { shouldValidate: false })
    }
  }, [watchedAmount, lastEditedField, form])

  // Reset contract when resident changes
  useEffect(() => {
    form.setValue('contractId', '')
    setSelectedContractInfo(null)
    setDateConstraints({ minDate: null, maxDate: null })
    setIsDateOutOfBounds(false)
    setDateWarning(null)
  }, [watchedResidentId, form])

  // Validate date against contract boundaries
  useEffect(() => {
    if (watchedOccurredAt && selectedContractInfo) {
      checkDateBounds(watchedOccurredAt, selectedContractInfo)
    }
  }, [watchedOccurredAt, selectedContractInfo])

  // When end-of-month mode is on and date changes, snap qty to days in that month
  useEffect(() => {
    if (endOfMonthMode && watchedOccurredAt) {
      const d = watchedOccurredAt instanceof Date ? watchedOccurredAt : new Date(watchedOccurredAt)
      if (!isNaN(d.getTime())) {
        const days = daysInMonth(d.getFullYear(), d.getMonth() + 1)
        const currentQty = form.getValues('quantity')
        if (currentQty !== days) {
          form.setValue('quantity', days, { shouldValidate: true })
          setLastEditedField('quantity')
        }
      }
    }
  }, [watchedOccurredAt, endOfMonthMode, form])

  const handleContractChange = (contractId: string) => {
    if (selectedResident && contractId) {
      const contract = selectedResidentContracts.find((c: any) => c.id === contractId)
      setSelectedContractInfo(contract)
      if (contract) {
        const minDate = contract.startDate ? new Date(contract.startDate).toLocaleDateString('en-CA') : null
        const maxDate = contract.endDate ? new Date(contract.endDate).toLocaleDateString('en-CA') : null
        setDateConstraints({ minDate, maxDate })
        const currentDate = form.getValues('occurredAt')
        if (currentDate) checkDateBounds(currentDate, contract)
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
  
  const checkDateBounds = (selectedDate: Date, contract: any) => {
    const contractStart = contract.startDate ? new Date(contract.startDate) : null
    const contractEnd = contract.endDate ? new Date(contract.endDate) : null
    let outOfBounds = false
    let warning = null
    if (contractStart && selectedDate < contractStart) {
      outOfBounds = true
      warning = `Date is before contract start (${contractStart.toLocaleDateString()}).`
    } else if (contractEnd && selectedDate > contractEnd) {
      outOfBounds = true
      warning = `Date is after contract end (${contractEnd.toLocaleDateString()}).`
    }
    setIsDateOutOfBounds(outOfBounds)
    setDateWarning(warning)
  }

  const doSubmit = async (data: FormData, andNext: boolean) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const calculatedAmount = data.amount || (data.quantity * data.unitPrice)
      const input: TransactionCreateInput = {
        ...data,
        occurredAt: data.occurredAt instanceof Date ? data.occurredAt : new Date(data.occurredAt),
        amount: calculatedAmount,
        serviceCode: data.serviceCode || '',
        isOrphaned: isDateOutOfBounds
      }
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })
      const result = await response.json() as { success: boolean; data?: any; error?: string }
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create transaction')
      }

      setCreateCount(prev => prev + 1)

      if (andNext && endOfMonthMode) {
        // Advance to next month: set date to last day of next month,
        // quantity = days in that next month, keep unit price
        const currentDate = data.occurredAt instanceof Date ? data.occurredAt : new Date(data.occurredAt)
        const nextDate = advanceToNextMonthEnd(currentDate)
        const nextDays = daysInMonth(nextDate.getFullYear(), nextDate.getMonth() + 1)
        const currentUnitPrice = data.unitPrice

        // Show transition overlay
        const nextLabel = nextDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
        setTransitionLabel(nextLabel)
        setTransitioning(true)

        // Brief pause for the visual transition
        await new Promise(resolve => setTimeout(resolve, 700))

        form.setValue('occurredAt', nextDate, { shouldValidate: true })
        form.setValue('quantity', nextDays, { shouldValidate: true })
        form.setValue('unitPrice', currentUnitPrice, { shouldValidate: true })
        const newAmount = Math.round(nextDays * currentUnitPrice * 100) / 100
        form.setValue('amount', newAmount, { shouldValidate: true })
        setLastEditedField('quantity')

        setTransitioning(false)

        // Do NOT call onSuccess here — that would close the dialog.
        // We'll call it when the user clicks "Done" or does a normal create.
      } else {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transaction')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    await doSubmit(data, false)
  }

  const residentHouse = selectedResident ? houses.find(h => h.id === selectedResident.houseId) : null

  // ─── Loading state ───
  if (isLoading) {
    return (
      <Dialog open={true} onClose={onClose} className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Transaction</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ─── Main dialog ───
  return (
    <Dialog
      open={true}
      onClose={onClose}
      className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl"
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'drawdown' ? 'Drawing Down Transaction' : 'Create Transaction'}
          </DialogTitle>
          {mode === 'drawdown' && (
            <p className="text-sm text-gray-500 mt-1">
              Record billable transaction at point of service. All fields are mandatory for NDIS compliance.
            </p>
          )}
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

          {/* ─── Row 1: Resident + Contract side-by-side ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Resident */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resident *</label>
            <select
              {...form.register('residentId')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Select a resident...</option>
              {residents.map(resident => {
                const house = houses.find(h => h.id === resident.houseId)
                return (
                  <option key={resident.id} value={resident.id}>
                      {resident.firstName} {resident.lastName} — {house?.descriptor || house?.address1 || 'Unknown House'}
                  </option>
                )
              })}
            </select>
            {form.formState.errors.residentId && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.residentId.message}</p>
            )}
          </div>

            {/* Contract */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contract *</label>
              {!selectedResident ? (
                <select disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400">
                  <option>Select a resident first</option>
                </select>
              ) : availableContracts.length > 0 ? (
                <select
                  {...form.register('contractId')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  onChange={(e) => {
                    form.setValue('contractId', e.target.value)
                    handleContractChange(e.target.value)
                  }}
                >
                  <option value="">Select a contract...</option>
                  {availableContracts.map(contract => (
                    <option key={contract.id} value={contract.id}>
                      {contract.type} — ${contract.currentBalance.toLocaleString()} remaining
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 border border-yellow-200 rounded-lg bg-yellow-50 text-sm text-yellow-700">
                  {fundingContracts[selectedResident.id] === undefined
                    ? 'Loading contracts...'
                    : 'No active contracts available.'}
                </div>
              )}
              {form.formState.errors.contractId && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.contractId.message}</p>
              )}
            </div>
                </div>

          {/* ─── Context banner: resident + contract info ─── */}
          {selectedResident && residentHouse && selectedContract && (
            <div className="flex items-center gap-4 bg-gray-50 rounded-lg px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                  {selectedResident.firstName?.[0]}{selectedResident.lastName?.[0]}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedResident.firstName} {selectedResident.lastName}</p>
                  <p className="text-gray-500 text-xs">{residentHouse.descriptor || residentHouse.address1}</p>
                </div>
              </div>
              <div className="h-8 border-l border-gray-200" />
                <div>
                <p className="text-gray-500 text-xs">Contract</p>
                <p className="font-medium text-gray-900">{selectedContract.type}</p>
                </div>
              <div className="h-8 border-l border-gray-200" />
                <div>
                <p className="text-gray-500 text-xs">Balance</p>
                <p className="font-semibold text-green-600">${selectedContract.currentBalance.toLocaleString()}</p>
                </div>
              {selectedContractInfo?.startDate && (
                  <>
                  <div className="h-8 border-l border-gray-200" />
                    <div>
                    <p className="text-gray-500 text-xs">Period</p>
                    <p className="text-gray-700 text-xs">
                      {new Date(selectedContractInfo.startDate).toLocaleDateString()} — {selectedContractInfo.endDate ? new Date(selectedContractInfo.endDate).toLocaleDateString() : 'Ongoing'}
                      </p>
                    </div>
                  </>
                )}
            </div>
          )}

          {/* ─── Row 2: Date + Service Code ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Delivery *</label>
              <input
                type="date"
                {...form.register('occurredAt')}
                min={dateConstraints.minDate || undefined}
                max={dateConstraints.maxDate || undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {form.formState.errors.occurredAt && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.occurredAt.message}</p>
              )}
              {isDateOutOfBounds && dateWarning && (
                <p className="text-yellow-700 text-xs mt-1 bg-yellow-50 rounded px-2 py-1">{dateWarning}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Code</label>
              <input
                {...form.register('serviceCode')}
                placeholder="e.g. SDA_RENT, SIL_SUPPORT"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {form.formState.errors.serviceCode && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.serviceCode.message}</p>
              )}
            </div>
          </div>

          {/* ─── Drawing Down Specific Fields ─── */}
          {mode === 'drawdown' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-blue-800 text-sm">NDIS Drawing Down Requirements</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NDIS Service Item Code * <span className="text-red-500">(Required)</span>
                  </label>
                  <select
                    {...form.register('serviceItemCode')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  >
                    <option value="">Select code...</option>
                    <option value="01_001_0107_1_1">01_001_0107_1_1 — SDA Rent</option>
                    <option value="01_001_0108_1_1">01_001_0108_1_1 — SIL Support</option>
                    <option value="01_001_0109_1_1">01_001_0109_1_1 — Core Support</option>
                    <option value="01_001_0110_1_1">01_001_0110_1_1 — Capacity Building</option>
                    <option value="01_001_0111_1_1">01_001_0111_1_1 — Transport</option>
                    <option value="01_001_0112_1_1">01_001_0112_1_1 — Equipment</option>
                    <option value="01_001_0113_1_1">01_001_0113_1_1 — Therapy</option>
                    <option value="01_001_0114_1_1">01_001_0114_1_1 — Respite</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Support Agreement ID</label>
                  <input
                    {...form.register('supportAgreementId')}
                    placeholder="e.g. SA-2024-001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Support Description * <span className="text-red-500">(Required)</span>
                </label>
                <textarea
                  {...form.register('note')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the specific support provided..."
                  required
                />
              </div>
            </div>
          )}

          {/* ─── Note (standard mode) ─── */}
          {mode !== 'drawdown' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <textarea
                {...form.register('note')}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of the service provided..."
              />
            </div>
          )}

          {/* ─── Row 3: Quantity / Unit Price / Amount ─── */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Pricing</p>
            <div className="grid grid-cols-3 gap-4">
            {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      const current = form.getValues('quantity') || 1
                      form.setValue('quantity', Math.max(1, current - 1))
                      setLastEditedField('quantity')
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-l-lg bg-white hover:bg-gray-50 text-gray-600 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    {...form.register('quantity', { valueAsNumber: true })}
                    onChange={(e) => {
                      form.register('quantity', { valueAsNumber: true }).onChange(e)
                      setLastEditedField('quantity')
                    }}
                    className="w-full px-3 py-2 border-t border-b border-gray-300 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const current = form.getValues('quantity') || 1
                      form.setValue('quantity', current + 1)
                      setLastEditedField('quantity')
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-r-lg bg-white hover:bg-gray-50 text-gray-600 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10"
                  >
                    +
                  </button>
                </div>
                {form.formState.errors.quantity && (
                  <p className="text-red-600 text-xs mt-1">{form.formState.errors.quantity.message}</p>
                )}
            </div>

            {/* Unit Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register('unitPrice', { valueAsNumber: true })}
                    onChange={(e) => {
                      form.register('unitPrice', { valueAsNumber: true }).onChange(e)
                      setLastEditedField('unitPrice')
                    }}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                {form.formState.errors.unitPrice && (
                  <p className="text-red-600 text-xs mt-1">{form.formState.errors.unitPrice.message}</p>
                )}
            </div>

            {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                  {lastEditedField !== 'amount' && (watchedQuantity || 0) > 0 && (watchedUnitPrice || 0) > 0 && (
                    <span className="text-gray-400 font-normal ml-1">(auto)</span>
                  )}
              </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('amount', { valueAsNumber: true })}
                    onChange={(e) => {
                      form.register('amount', { valueAsNumber: true }).onChange(e)
                      setLastEditedField('amount')
                    }}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                {form.formState.errors.amount && (
                  <p className="text-red-600 text-xs mt-1">{form.formState.errors.amount.message}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {lastEditedField === 'amount'
                    ? 'Qty set to 1, unit price = amount'
                    : 'Qty × Unit Price, or enter directly'}
                </p>
              </div>
            </div>
          </div>

          {/* ─── End of Month mode toggle ─── */}
          <div className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${endOfMonthMode ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={endOfMonthMode}
                onChange={(e) => {
                  setEndOfMonthMode(e.target.checked)
                  if (e.target.checked) {
                    const currentDate = form.getValues('occurredAt')
                    if (currentDate) {
                      const d = currentDate instanceof Date ? currentDate : new Date(currentDate)
                      const days = daysInMonth(d.getFullYear(), d.getMonth() + 1)
                      form.setValue('quantity', days, { shouldValidate: true })
                      setLastEditedField('quantity')
                      const eom = lastDayOfMonth(d)
                      form.setValue('occurredAt', eom, { shouldValidate: true })
                    }
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">End of Month Roll-up</p>
              <p className="text-xs text-gray-500">
                {endOfMonthMode
                  ? 'Qty = days in month. Create & advance to next month automatically.'
                  : 'Auto-fill monthly roll-up transactions.'}
              </p>
            </div>
            {endOfMonthMode && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {(() => {
                  const d = watchedOccurredAt instanceof Date ? watchedOccurredAt : new Date(watchedOccurredAt || Date.now())
                  return `${d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })} · ${daysInMonth(d.getFullYear(), d.getMonth() + 1)} days`
                })()}
              </span>
            )}
          </div>

          {/* ─── Success banner for Create & Next ─── */}
          {createCount > 0 && endOfMonthMode && (
            <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-700 text-xs font-medium">
                {createCount} transaction{createCount > 1 ? 's' : ''} created — form advanced to next month
              </p>
            </div>
          )}

          {/* ─── Error ─── */}
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* ─── Footer ─── */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                // If transactions were created during this session, notify parent to refresh
                if (createCount > 0) {
                  onSuccess()
                } else {
                  onClose()
                }
              }}
              disabled={isSubmitting || transitioning}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {createCount > 0 ? 'Done' : 'Cancel'}
            </button>
            {endOfMonthMode && (
              <button
                type="button"
                disabled={isSubmitting || transitioning}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                onClick={form.handleSubmit((data) => doSubmit(data, true))}
              >
                {isSubmitting || transitioning ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>Create & Next →</>
                )}
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || transitioning}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting && !transitioning
                ? 'Creating…'
                : (mode === 'drawdown' ? 'Create Drawdown' : 'Create Transaction')
              }
            </button>
          </div>
        </form>

        {/* ─── Transition overlay for Create & Next ─── */}
        {transitioning && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl">
            <div className="text-center animate-in fade-in duration-300">
              <div className="relative mx-auto mb-4 w-14 h-14">
                <div className="absolute inset-0 rounded-full border-4 border-green-200" />
                <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
                <svg className="absolute inset-0 m-auto w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900">Transaction created ✓</p>
              <p className="text-xs text-gray-500 mt-1">Loading <span className="font-medium text-blue-600">{transitionLabel}</span>…</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
