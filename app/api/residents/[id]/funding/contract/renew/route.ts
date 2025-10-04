import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateContractRenewal } from 'lib/utils/funding-calculations'
import type { FundingInformation } from 'types/resident'

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

/**
 * POST /api/residents/[id]/funding/contract/renew
 * Create renewal contract linked to expiring contract
 */
interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  try {
    const { id: residentId } = await params
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

    // TODO: Implement actual contract renewal logic
    // This would involve:
    // 1. Fetching the expiring contract from the database
    // 2. Validating it's eligible for renewal
    // 3. Creating a new contract with updated terms
    // 4. Linking the new contract to the original
    // 5. Updating the original contract status to 'Renewed'

    // Mock the expiring contract for renewal generation
    const expiringContract: FundingInformation = {
      id: contractId,
      type: 'Draw Down',
      amount: newAmount || 10000,
      startDate: newStartDate || new Date(),
      endDate: newEndDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      description: 'Renewal contract',
      isActive: true,
      contractStatus: 'Draft',
      originalAmount: newAmount || 10000,
      currentBalance: 0,
      drawdownRate: 'weekly',
      autoDrawdown: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const renewalContract = generateContractRenewal(expiringContract)

    return NextResponse.json({
      success: true,
      data: renewalContract
    })
  } catch (error) {
    console.error('Error creating contract renewal:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create contract renewal'
    }, { status: 500 })
  }
}
