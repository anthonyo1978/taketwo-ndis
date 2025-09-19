import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ContractStatus } from 'types/resident'

// Contract status update schema
const contractStatusUpdateSchema = z.object({
  contractId: z.string().min(1, 'Contract ID is required'),
  status: z.enum(['Draft', 'Active', 'Expired', 'Cancelled', 'Renewed'] as const)
})

interface ApiResponse {
  success: boolean
  data?: any
  error?: string
  details?: Array<{ message: string }>
}

/**
 * PUT /api/residents/[id]/funding/contract/status
 * Update contract status (Draft, Active, Expired, Cancelled, Renewed)
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

    // TODO: Implement actual contract status update logic
    // This would involve:
    // 1. Fetching the contract from the database
    // 2. Validating the status transition is allowed
    // 3. Updating the contract status
    // 4. Handling any side effects (e.g., stopping auto-drawdown for cancelled contracts)

    // Mock response for now
    const updatedContract = {
      id: contractId,
      contractStatus: status,
      updatedAt: new Date().toISOString()
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
