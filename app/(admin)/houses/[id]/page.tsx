"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { ResidentSelectionModal } from "components/residents/ResidentSelectionModal"
import { ResidentTable } from "components/residents/ResidentTable"
import { HouseImageUpload } from "components/houses/HouseImageUpload"
import { OccupancyBadge } from "components/houses/OccupancyBadge"
import { OccupancyHistoryGrid } from "components/houses/OccupancyHistoryGrid"
import { OwnerSummaryCard } from "components/owners/OwnerSummaryCard"
import { OwnerModal } from "components/owners/OwnerModal"
import { HeadLeaseCard } from "components/head-leases/HeadLeaseCard"
import { HeadLeaseModal } from "components/head-leases/HeadLeaseModal"
import { HouseSuppliersList } from "components/suppliers/HouseSuppliersList"
import { LinkSupplierModal } from "components/suppliers/LinkSupplierModal"
import { HouseExpensesList } from "components/expenses/HouseExpensesList"
import { CreateExpenseModal, type DuplicateExpenseData } from "components/expenses/CreateExpenseModal"
import type { HouseExpense } from "types/house-expense"
import { IncomeVsExpenseChart } from "components/charts/IncomeVsExpenseChart"
import { getResidentBillingStatus, getBillingStatusRingClass } from "lib/utils/billing-status"
import type { House } from "types/house"
import type { Resident } from "types/resident"
import type { HeadLease } from "types/head-lease"

interface OccupancyData {
  current: {
    occupied_bedrooms: number
    total_bedrooms: number
    occupancy_rate: number
  }
  history: Array<{
    month_start: string
    month_name: string
    occupied_bedrooms: number
    total_bedrooms: number
    occupancy_rate: number
  }>
}

interface ApiResponse {
  success: boolean
  data?: House
  error?: string
}

/* ── Small reusable detail item ── */
function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900 truncate">{children}</dd>
    </div>
  )
}


export default function HouseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  
  const [house, setHouse] = useState<House | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showResidentSelection, setShowResidentSelection] = useState(false)
  const [residentRefreshTrigger, setResidentRefreshTrigger] = useState(0)
  const [currentResidents, setCurrentResidents] = useState<Resident[]>([])
  const [occupancyData, setOccupancyData] = useState<OccupancyData | null>(null)
  const [occupancyLoading, setOccupancyLoading] = useState(true)
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'details' | 'finance' | 'ownership' | 'suppliers' | 'utilities'>('details')
  
  // Ownership & Lease state
  const [currentLease, setCurrentLease] = useState<HeadLease | null>(null)
  const [leaseLoading, setLeaseLoading] = useState(false)
  const [showOwnerModal, setShowOwnerModal] = useState(false)
  const [showLeaseModal, setShowLeaseModal] = useState(false)
  
  // Suppliers state
  const [showLinkSupplierModal, setShowLinkSupplierModal] = useState(false)
  const [supplierRefreshTrigger, setSupplierRefreshTrigger] = useState(0)
  const [showSupplierExpenseModal, setShowSupplierExpenseModal] = useState(false)
  
  // Expenses state
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [expenseRefreshTrigger, setExpenseRefreshTrigger] = useState(0)
  
  // Utilities state
  const [showUtilityLinkSupplierModal, setShowUtilityLinkSupplierModal] = useState(false)
  const [utilitySupplierRefreshTrigger, setUtilitySupplierRefreshTrigger] = useState(0)
  const [showUtilityExpenseModal, setShowUtilityExpenseModal] = useState(false)
  const [utilityExpenseRefreshTrigger, setUtilityExpenseRefreshTrigger] = useState(0)

  // Duplicate expense state
  const [duplicateExpenseData, setDuplicateExpenseData] = useState<DuplicateExpenseData | null>(null)

  /** Convert a HouseExpense into a DuplicateExpenseData and open the appropriate modal */
  const handleDuplicateExpense = (expense: HouseExpense, target: 'expense' | 'supplier' | 'utility') => {
    const dup: DuplicateExpenseData = {
      category: expense.category,
      description: expense.description,
      reference: expense.reference,
      amount: expense.amount,
      frequency: expense.frequency,
      notes: expense.notes,
      headLeaseId: expense.headLeaseId,
      isSnapshot: expense.isSnapshot,
      meterReading: expense.meterReading,
      readingUnit: expense.readingUnit,
    }
    setDuplicateExpenseData(dup)
    if (target === 'expense') setShowExpenseModal(true)
    else if (target === 'supplier') setShowSupplierExpenseModal(true)
    else setShowUtilityExpenseModal(true)
  }

  useEffect(() => {
    const fetchHouse = async () => {
      if (!id) return
      
      try {
        const response = await fetch(`/api/houses/${id}`)
        const result = await response.json() as ApiResponse
        
        if (result.success && result.data) {
          setHouse(result.data)
        } else {
          setError(result.error || 'House not found')
        }
      } catch (err) {
        setError('Failed to load house details')
        console.error('Error fetching house:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchHouse()
  }, [id])

  // Fetch occupancy data
  useEffect(() => {
    const fetchOccupancy = async () => {
      if (!id) return
      
      try {
        const response = await fetch(`/api/houses/${id}/occupancy`)
        const result = await response.json() as { success: boolean; data?: OccupancyData }
        
        if (result.success && result.data) {
          setOccupancyData(result.data)
        }
      } catch (err) {
        console.error('Error fetching occupancy:', err)
      } finally {
        setOccupancyLoading(false)
      }
    }

    fetchOccupancy()
  }, [id, residentRefreshTrigger])

  // Fetch lease data when ownership tab is active
  useEffect(() => {
    if (activeTab === 'ownership' && id) {
      fetchLeaseData()
    }
  }, [activeTab, id])


  const fetchLeaseData = async () => {
    setLeaseLoading(true)
    try {
      const response = await fetch(`/api/head-leases?houseId=${id}`)
      const result = await response.json() as { success: boolean; data?: HeadLease[] }
      if (result.success && result.data && result.data.length > 0) {
        setCurrentLease(result.data[0] || null)
      } else {
        setCurrentLease(null)
      }
    } catch (error) {
      console.error('Error fetching lease:', error)
    } finally {
      setLeaseLoading(false)
    }
  }

  const handleResidentAssigned = async (resident: Resident, roomLabel?: string, moveInDate?: Date) => {
    try {
      const response = await fetch(`/api/houses/${id}/residents/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          residentId: resident.id,
          roomLabel: roomLabel,
          moveInDate: moveInDate 
        })
      })

      const result = await response.json() as { success: boolean; message?: string; error?: string }

      if (result.success) {
        setShowResidentSelection(false)
        await new Promise(resolve => setTimeout(resolve, 200))
        setResidentRefreshTrigger(prev => prev + 1)
        console.log(result.message)
      } else {
        console.error('Failed to assign resident:', result.error)
      }
    } catch (error) {
      console.error('Error assigning resident:', error)
    }
  }

  const handleImageUploaded = (imageUrl: string) => {
    setHouse(prev => prev ? { ...prev, imageUrl } : null)
  }

  const handleImageRemoved = () => {
    setHouse(prev => prev ? { ...prev, imageUrl: undefined } : null)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !house) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto text-center py-12">
          <div className="text-red-600 mb-4">{error || 'House not found'}</div>
          <Link href="/houses" className="text-blue-600 hover:text-blue-800 text-sm">
              ← Back to Houses
            </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">

        {/* ─── Header ─── */}
        <div className="mb-6">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-400 mb-3">
            <Link href="/houses" className="text-blue-600 hover:text-blue-800">Houses</Link>
            <span>→</span>
            <span className="text-gray-600">
              {house.descriptor || `${house.address1}, ${house.suburb}`}
            </span>
          </nav>
          
          {/* Title row */}
          <div className="flex items-center gap-4">
            <img
              src={house.imageUrl || '/assets/Haven_House_App_Icon_Compressed.jpg'}
              alt={house.descriptor || house.address1}
              className="w-14 h-14 rounded-xl object-cover border border-gray-200 flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-gray-900 truncate leading-tight">
                  {house.descriptor || `${house.address1}${house.unit ? `, ${house.unit}` : ''}`}
                </h1>
              <p className="text-sm text-gray-500 truncate mt-0.5">
                {house.descriptor
                  ? `${house.address1}${house.unit ? `, ${house.unit}` : ''}, ${house.suburb}, ${house.state} ${house.postcode}`
                  : `${house.suburb}, ${house.state} ${house.postcode}, ${house.country}`}
              </p>
            </div>
            
            <span className={`flex-shrink-0 inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                house.status === 'Active' 
                  ? 'bg-green-100 text-green-800'
                  : house.status === 'Vacant'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {house.status}
              </span>
              
            {occupancyData && (
              <div className="flex-shrink-0">
                <OccupancyBadge
                  occupiedBedrooms={occupancyData.current.occupied_bedrooms}
                  totalBedrooms={occupancyData.current.total_bedrooms}
                  size="sm"
                  showDetails={false}
                />
              </div>
            )}

            <div className="flex-shrink-0 flex items-center gap-2">
              <Link
                href={`/houses/${house.id}/edit`}
                className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors inline-flex items-center gap-1.5"
              >
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Link>
              <Link
                href="/houses"
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                ← Back
              </Link>
            </div>
          </div>
        </div>

        {/* ─── Tab Navigation ─── */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-6">
            {([
              { key: 'details', label: 'Details & Residents' },
              { key: 'finance', label: 'Finance Overview' },
              { key: 'ownership', label: 'Ownership & Lease' },
              { key: 'suppliers', label: 'Suppliers' },
              { key: 'utilities', label: 'Utilities & Charges' },
            ] as const).map((tab) => (
            <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
                {tab.label}
            </button>
            ))}
          </nav>
        </div>

        {/* ═══════════ Details & Residents Tab ═══════════ */}
        {activeTab === 'details' && (
          <>
            {/* ── Row 1: Property Info Strip ── */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <dl className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-3">
                <DetailItem label="House ID">
                  <span className="font-mono text-xs">{house.id.slice(0, 8)}…</span>
                </DetailItem>
                <DetailItem label="Bedrooms">
                  {house.bedroomCount || <span className="text-gray-400">Not set</span>}
                </DetailItem>
                <DetailItem label="Go-Live">
                  {new Date(house.goLiveDate).toLocaleDateString()}
                </DetailItem>
                {house.enrolmentDate && (
                  <DetailItem label="Enrolment">
                    {new Date(house.enrolmentDate).toLocaleDateString()}
                  </DetailItem>
                )}
                        {house.dwellingType && (
                  <DetailItem label="Dwelling Type">
                            {house.dwellingType}
                  </DetailItem>
                        )}
                        {house.sdaDesignCategory && (
                  <DetailItem label="SDA Category">
                            {house.sdaDesignCategory}
                  </DetailItem>
                        )}
                        {house.sdaRegistrationStatus && (
                  <DetailItem label="Registration">
                            {house.sdaRegistrationStatus}
                  </DetailItem>
                )}
                {house.hasOoa && (
                  <DetailItem label="OOA">
                    <span className="inline-flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-amber-400" />
                      Yes
                      {house.ooaNotes && <span className="text-gray-400 ml-1 truncate">— {house.ooaNotes}</span>}
                        </span>
                  </DetailItem>
                )}
                {house.electricityNmi && (
                  <DetailItem label="Electricity NMI">
                    <span className="font-mono text-xs">{house.electricityNmi}</span>
                  </DetailItem>
                )}
              </dl>
            </div>

            {/* ── Row 2: Residents widget (left) + House Image (right) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Residents quick-view — takes 2/3 */}
              <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Residents
                    {currentResidents.length > 0 && (
                      <span className="ml-1.5 text-gray-400 font-normal">
                        ({currentResidents.length}{house.bedroomCount ? `/${house.bedroomCount} beds` : ''})
                      </span>
                    )}
                  </h3>
            <button
                    onClick={() => setShowResidentSelection(true)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1.5"
                  >
                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Resident
            </button>
                </div>

                {currentResidents.length === 0 ? (
                  <div className="py-8 text-center">
                    <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-1.053M18 6.75a3 3 0 11-6 0 3 3 0 016 0zm-8.25 6a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-400">No residents assigned yet</p>
            <button
                      onClick={() => setShowResidentSelection(true)}
                      className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      Assign a resident →
            </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {currentResidents.map((r) => {
                      const billingStatus = getResidentBillingStatus(r)
                      const ringClass = getBillingStatusRingClass(billingStatus.status)
                      return (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                        onClick={() => router.push(`/residents/${r.id}`)}
                      >
                        {/* Avatar with billing status ring */}
                        <div className="flex-shrink-0 relative group/avatar">
                          {(r.photoUrl || r.photoBase64) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.photoUrl || r.photoBase64}
                              alt={`${r.firstName} ${r.lastName}`}
                              className={`w-10 h-10 rounded-full object-cover ${ringClass}`}
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center ${ringClass}`}>
                              <span className="text-xs font-medium text-gray-500">
                                {r.firstName.charAt(0)}{r.lastName.charAt(0)}
                              </span>
        </div>
                          )}
                          {/* Billing status tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                            {billingStatus.status === 'ready' ? 'Billing ready' : `Not billing: ${billingStatus.reasons.join(', ')}`}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
              </div>

                        {/* Name + Room + Move-in */}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate leading-tight">
                            {r.firstName} {r.lastName}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {r.roomLabel || 'No room assigned'}
                          </p>
                          {r.moveInDate && (
                            <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                              <svg className="size-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Moved in {new Date(r.moveInDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          )}
              </div>

                        {/* Quick info chips */}
                        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                          {r.ndisId && (
                            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              NDIS
                  </span>
                          )}
                          {r.participantFundingLevelLabel && (
                            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {r.participantFundingLevelLabel}
                            </span>
                          )}
              </div>

                        {/* Arrow */}
                        <svg className="size-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      )
                    })}
              </div>
              )}
          </div>

              {/* House Image upload — takes 1/3 */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">House Image</h3>
                {house.imageUrl && (
                  <button
                    onClick={() => {
                        if (confirm('Remove this image?')) handleImageRemoved()
                    }}
                      className="text-red-500 hover:text-red-700 text-xs font-medium transition-colors"
                  >
                      Remove
                  </button>
                )}
              </div>
              <HouseImageUpload
                houseId={house.id}
                currentImageUrl={house.imageUrl}
                onImageUploaded={handleImageUploaded}
                onImageRemoved={handleImageRemoved}
              />
            </div>
                </div>
                
            {/* ── Notes (if any) ── */}
            {house.notes && (
              <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{house.notes}</p>
                  </div>
                )}
                
            {/* Hidden ResidentTable for data loading */}
            <div className="hidden">
          <ResidentTable 
            houseId={id} 
            refreshTrigger={residentRefreshTrigger}
            onResidentsLoaded={(residents) => {
              setCurrentResidents(prev => {
                const prevIds = prev.map(r => r.id).sort()
                const newIds = residents.map(r => r.id).sort()
                if (prevIds.length !== newIds.length || !prevIds.every((id, index) => id === newIds[index])) {
                  return residents
                }
                return prev
              })
            }}
            onResidentRemoved={() => setResidentRefreshTrigger(prev => prev + 1)}
          />
                      </div>

            {/* ── Occupancy History (green/red grid) ── */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Occupancy History</h3>
              {occupancyLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <p className="ml-2 text-sm text-gray-400">Loading…</p>
                </div>
              ) : !house.bedroomCount || house.bedroomCount === 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700 flex items-center gap-2">
                    <svg className="size-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Set the bedroom count via <strong>Edit</strong> to enable occupancy tracking.
                  </p>
                </div>
              ) : occupancyData && occupancyData.current ? (
                <OccupancyHistoryGrid
                  houseId={house.id}
                  currentOccupiedBedrooms={occupancyData.current.occupied_bedrooms}
                  totalBedrooms={occupancyData.current.total_bedrooms}
                  residents={currentResidents}
                  goLiveDate={house.goLiveDate}
                />
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-700 flex items-center gap-2">
                    <svg className="size-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Occupancy data not available. Bedroom count: {house.bedroomCount || 'Not set'}. Try refreshing.
                  </p>
                </div>
              )}
            </div>

            {/* ── Audit Information (bottom) ── */}
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Record Audit</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div className="flex justify-between sm:justify-start sm:gap-4">
                  <span className="text-gray-400">Created</span>
                  <span className="text-gray-500">
                    {new Date(house.createdAt).toLocaleString()} by {house.createdBy}
                  </span>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-4">
                  <span className="text-gray-400">Last updated</span>
                  <span className="text-gray-500">
                    {new Date(house.updatedAt).toLocaleString()} by {house.updatedBy}
                  </span>
                </div>
            </div>
          </div>
          </>
        )}

        {/* ═══════════ Finance Overview Tab ═══════════ */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            <IncomeVsExpenseChart
            houseId={id} 
              refreshTrigger={expenseRefreshTrigger}
              defaultPeriod="6m"
          />
        </div>
        )}

        {/* ═══════════ Ownership & Lease Tab ═══════════ */}
        {activeTab === 'ownership' && (
          <div className="space-y-6">
            {leaseLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <p className="ml-2 text-sm text-gray-400">Loading lease information…</p>
              </div>
            ) : currentLease ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {currentLease.owner && (
                  <OwnerSummaryCard owner={currentLease.owner} onUpdate={fetchLeaseData} />
                )}
                <HeadLeaseCard lease={currentLease} onUpdate={fetchLeaseData} />
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Head Lease</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create a head lease to track ownership and lease details.
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setShowOwnerModal(true)}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Add Owner First
                  </button>
                  <button
                    onClick={() => setShowLeaseModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Create Head Lease
                  </button>
                </div>
              </div>
            )}

            {/* ── Expenses / Outgoings ── */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <HouseExpensesList
                houseId={id}
                refreshTrigger={expenseRefreshTrigger}
                onAddExpense={() => setShowExpenseModal(true)}
                onDuplicate={(exp) => handleDuplicateExpense(exp, 'expense')}
              />
            </div>
          </div>
        )}

        {/* ═══════════ Suppliers Tab ═══════════ */}
        {activeTab === 'suppliers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Linked Suppliers</h2>
                <p className="text-sm text-gray-500 mt-0.5">Maintenance and service providers</p>
              </div>
              <button
                onClick={() => setShowLinkSupplierModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 text-sm font-medium"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Link Supplier
              </button>
            </div>
            
            <HouseSuppliersList 
              houseId={id} 
              refreshTrigger={supplierRefreshTrigger}
              onUpdate={() => setSupplierRefreshTrigger(prev => prev + 1)}
            />

            {/* ── Supplier Expenses ── */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Supplier Expenses</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Bills and invoices from linked suppliers</p>
                </div>
                <button
                  onClick={() => setShowSupplierExpenseModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 text-sm font-medium"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Expense
                </button>
              </div>

              {/* Show maintenance/supplier expenses for this house */}
              <HouseExpensesList
                houseId={id}
                refreshTrigger={expenseRefreshTrigger}
                onAddExpense={() => setShowSupplierExpenseModal(true)}
                filterCategory="maintenance"
                hideHeader
                onDuplicate={(exp) => handleDuplicateExpense(exp, 'supplier')}
              />
            </div>
          </div>
        )}

        {/* ═══════════ Utilities & Charges Tab ═══════════ */}
        {activeTab === 'utilities' && house && house.id && (
          <div className="space-y-6">

            {/* ── Utility Suppliers ── */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Utility Suppliers</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Electricity, water, gas, broadband and other utility providers</p>
                </div>
                <button
                  onClick={() => setShowUtilityLinkSupplierModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 text-sm font-medium"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Link Supplier
                </button>
              </div>

              <HouseSuppliersList
                houseId={id}
                refreshTrigger={utilitySupplierRefreshTrigger}
                onUpdate={() => setUtilitySupplierRefreshTrigger(prev => prev + 1)}
              />
            </div>

            {/* ── Utility Charges & Expenses ── */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Utility Charges</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Bills, invoices and meter readings from utility providers</p>
              </div>
                <button
                  onClick={() => setShowUtilityExpenseModal(true)}
                  className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors inline-flex items-center gap-1.5 text-sm font-medium"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Charge
                </button>
              </div>

              {/* Legend for snapshot rows */}
              <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500" />
                  Snapshot / meter reading
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400" />
                  Regular charge
                </span>
              </div>

              <HouseExpensesList
                houseId={id}
                refreshTrigger={utilityExpenseRefreshTrigger}
                onAddExpense={() => setShowUtilityExpenseModal(true)}
                filterCategory="utilities"
                hideHeader
                onDuplicate={(exp) => handleDuplicateExpense(exp, 'utility')}
              />
            </div>

          </div>
        )}

        {/* ═══════════ Modals ═══════════ */}
        <ResidentSelectionModal
          open={showResidentSelection}
          onClose={() => setShowResidentSelection(false)}
          onSelect={handleResidentAssigned}
          houseId={id}
          excludeResidentIds={currentResidents.map(r => r.id)}
          key={`modal-${residentRefreshTrigger}`}
        />

        <OwnerModal
          isOpen={showOwnerModal}
          onClose={() => setShowOwnerModal(false)}
          onSuccess={fetchLeaseData}
          mode="create"
        />

        <HeadLeaseModal
          isOpen={showLeaseModal}
          onClose={() => setShowLeaseModal(false)}
          onSuccess={fetchLeaseData}
          houseId={id}
          mode="create"
        />

        <LinkSupplierModal
          isOpen={showLinkSupplierModal}
          onClose={() => setShowLinkSupplierModal(false)}
          onSuccess={() => {
            setShowLinkSupplierModal(false)
            setSupplierRefreshTrigger(prev => prev + 1)
          }}
          houseId={id}
        />

        <CreateExpenseModal
          isOpen={showExpenseModal}
          onClose={() => { setShowExpenseModal(false); setDuplicateExpenseData(null) }}
          onSuccess={() => setExpenseRefreshTrigger(prev => prev + 1)}
          houseId={id}
          headLease={currentLease}
          duplicateFrom={duplicateExpenseData}
        />

        {/* Supplier expense modal */}
        <CreateExpenseModal
          isOpen={showSupplierExpenseModal}
          onClose={() => { setShowSupplierExpenseModal(false); setDuplicateExpenseData(null) }}
          onSuccess={() => setExpenseRefreshTrigger(prev => prev + 1)}
          houseId={id}
          defaultCategory="maintenance"
          showSupplierPicker
          duplicateFrom={duplicateExpenseData}
        />

        {/* Utility supplier link modal */}
        <LinkSupplierModal
          isOpen={showUtilityLinkSupplierModal}
          onClose={() => setShowUtilityLinkSupplierModal(false)}
          onSuccess={() => {
            setShowUtilityLinkSupplierModal(false)
            setUtilitySupplierRefreshTrigger(prev => prev + 1)
          }}
          houseId={id}
        />

        {/* Utility expense modal (with snapshot support) */}
        <CreateExpenseModal
          isOpen={showUtilityExpenseModal}
          onClose={() => { setShowUtilityExpenseModal(false); setDuplicateExpenseData(null) }}
          onSuccess={() => setUtilityExpenseRefreshTrigger(prev => prev + 1)}
          houseId={id}
          defaultCategory="utilities"
          showSupplierPicker
          enableSnapshot
          duplicateFrom={duplicateExpenseData}
        />
      </div>
    </div>
  )
}
