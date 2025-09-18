import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { FundingInformation, ContractStatus } from '@/types/resident'
import { calculateCurrentBalance, generateContractRenewal } from '@/lib/utils/funding-calculations'

// Contract activation schema
const contractActivationSchema = z.object({
  contractId: z.string().min(1, 'Contract ID is required')
})

// Contract status update schema
const contractStatusUpdateSchema = z.object({
  contractId: z.string().min(1, 'Contract ID is required'),
  status: z.enum(['Draft', 'Active', 'Expired', 'Cancelled', 'Renewed'] as const)
})

// Contract renewal schema
const contractRenewalSchema = z.object({
  contractId: z.string().min(1, 'Contract ID is required'),
  newAmount: z.number().min(0).max(999999.99).optional(),
  newStartDate: z.coerce.date().optional(),
  newEndDate: z.coerce.date().optional()
})

interface ApiResponse {
  success: boolean
  data?: any
  error?: string
  details?: Array<{ message: string }>
}

// Mock data store - in production this would be database operations
const fundingContracts: FundingInformation[] = [
  // Mock contracts would be stored here
]

/**
 * GET /api/residents/[id]/funding/contract
 * Get all contracts for a resident
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    const residentId = params.id

    if (!residentId) {
      return NextResponse.json({
        success: false,
        error: 'Resident ID is required'
      }, { status: 400 })
    }

    // In production: fetch from database
    const contracts = fundingContracts.filter(contract => 
      // Mock: assuming contract has residentId field
      (contract as any).residentId === residentId
    )

    // Calculate current balances for all contracts
    const contractsWithBalances = contracts.map(contract => ({
      ...contract,
      currentBalance: calculateCurrentBalance(contract)
    }))

    return NextResponse.json({
      success: true,
      data: contractsWithBalances
    })
  } catch (error) {
    console.error('Error fetching contracts:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch contracts'
    }, { status: 500 })
  }
}

/**
 * POST /api/residents/[id]/funding/contract/activate
 * Activate a contract (set status to Active and initialize balance tracking)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    const residentId = params.id
    const body = await request.json()
    
    const validation = contractActivationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors.map(err => ({ message: err.message }))
      }, { status: 400 })
    }

    const { contractId } = validation.data

    // In production: find contract in database
    const contract = fundingContracts.find(c => c.id === contractId)
    if (!contract) {
      return NextResponse.json({
        success: false,
        error: 'Contract not found'
      }, { status: 404 })
    }

    // Validate contract can be activated
    if (contract.contractStatus !== 'Draft') {
      return NextResponse.json({
        success: false,
        error: 'Only Draft contracts can be activated'
      }, { status: 400 })
    }

    // Activate contract
    const activatedContract: FundingInformation = {
      ...contract,
      contractStatus: 'Active',
      isActive: true,
      currentBalance: contract.originalAmount,
      updatedAt: new Date()
    }

    // In production: update in database
    const contractIndex = fundingContracts.findIndex(c => c.id === contractId)
    if (contractIndex !== -1) {
      fundingContracts[contractIndex] = activatedContract
    }

    return NextResponse.json({
      success: true,
      data: activatedContract
    })
  } catch (error) {
    console.error('Error activating contract:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to activate contract'
    }, { status: 500 })
  }
}

/**
 * PUT /api/residents/[id]/funding/contract/status
 * Update contract status with validation
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    const residentId = params.id
    const body = await request.json()
    
    const validation = contractStatusUpdateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors.map(err => ({ message: err.message }))
      }, { status: 400 })
    }

    const { contractId, status } = validation.data

    // In production: find contract in database
    const contract = fundingContracts.find(c => c.id === contractId)
    if (!contract) {
      return NextResponse.json({
        success: false,
        error: 'Contract not found'
      }, { status: 404 })
    }

    // Validate status transition
    const validTransitions: Record<ContractStatus, ContractStatus[]> = {
      'Draft': ['Active', 'Cancelled'],
      'Active': ['Expired', 'Cancelled'],
      'Expired': ['Renewed', 'Cancelled'],
      'Cancelled': [],
      'Renewed': ['Active']
    }

    const currentStatus = contract.contractStatus
    if (!validTransitions[currentStatus]?.includes(status)) {
      return NextResponse.json({
        success: false,
        error: `Invalid status transition from ${currentStatus} to ${status}`
      }, { status: 400 })
    }

    // Update contract status
    const updatedContract: FundingInformation = {
      ...contract,
      contractStatus: status,
      isActive: status === 'Active',
      updatedAt: new Date()
    }

    // In production: update in database
    const contractIndex = fundingContracts.findIndex(c => c.id === contractId)
    if (contractIndex !== -1) {
      fundingContracts[contractIndex] = updatedContract
    }

    return NextResponse.json({
      success: true,
      data: updatedContract
    })
  } catch (error) {
    console.error('Error updating contract status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update contract status'
    }, { status: 500 })
  }
}

/**
 * POST /api/residents/[id]/funding/contract/renew
 * Create renewal contract linked to expiring contract
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    const residentId = params.id
    const body = await request.json()
    
    const validation = contractRenewalSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors.map(err => ({ message: err.message }))
      }, { status: 400 })
    }

    const { contractId, newAmount, newStartDate, newEndDate } = validation.data

    // In production: find contract in database
    const originalContract = fundingContracts.find(c => c.id === contractId)
    if (!originalContract) {
      return NextResponse.json({
        success: false,
        error: 'Original contract not found'
      }, { status: 404 })
    }

    // Validate contract can be renewed
    if (!['Expired', 'Active'].includes(originalContract.contractStatus)) {
      return NextResponse.json({
        success: false,
        error: 'Only Active or Expired contracts can be renewed'
      }, { status: 400 })
    }

    // Generate renewal contract
    const renewalData = generateContractRenewal(originalContract)
    
    // Override with any provided values
    if (newAmount !== undefined) renewalData.originalAmount = newAmount
    if (newStartDate !== undefined) renewalData.startDate = newStartDate
    if (newEndDate !== undefined) renewalData.endDate = newEndDate

    const renewalContract: FundingInformation = {
      ...renewalData,
      id: `contract-${Date.now()}`, // In production: generate proper ID
      createdAt: new Date(),
      updatedAt: new Date()
    } as FundingInformation

    // In production: save to database
    fundingContracts.push(renewalContract)

    // Mark original contract as renewed
    const updatedOriginal: FundingInformation = {
      ...originalContract,
      contractStatus: 'Renewed',
      updatedAt: new Date()
    }

    const originalIndex = fundingContracts.findIndex(c => c.id === contractId)
    if (originalIndex !== -1) {
      fundingContracts[originalIndex] = updatedOriginal
    }

    return NextResponse.json({
      success: true,
      data: {
        renewalContract,
        originalContract: updatedOriginal
      }
    })
  } catch (error) {
    console.error('Error renewing contract:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to renew contract'
    }, { status: 500 })
  }
}

/**
 * GET /api/residents/[id]/funding/contract/balance
 * Return current calculated balance for all contracts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    const residentId = params.id
    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action === 'balance') {
      // In production: fetch contracts from database
      const contracts = fundingContracts.filter(contract => 
        (contract as any).residentId === residentId
      )

      // Calculate balances for all contracts
      const balanceData = contracts.map(contract => ({
        contractId: contract.id,
        originalAmount: contract.originalAmount,
        currentBalance: calculateCurrentBalance(contract),
        contractStatus: contract.contractStatus,
        drawdownRate: contract.drawdownRate,
        autoDrawdown: contract.autoDrawdown
      }))

      return NextResponse.json({
        success: true,
        data: balanceData
      })
    }

    // Default: return all contracts
    return GET(request, { params })
  } catch (error) {
    console.error('Error fetching contract balance:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch contract balance'
    }, { status: 500 })
  }
}