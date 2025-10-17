import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from 'lib/supabase/server'
import { transactionService } from 'lib/supabase/services/transactions'
import type { TransactionCreateInput } from 'types/transaction'

// Validation schema for updating transactions
const updateTransactionSchema = z.object({
  occurredAt: z.coerce.date().optional(),
  serviceCode: z.string().transform(val => val === '' ? undefined : val).optional(),
  note: z.string().optional(), // Renamed from description for consistency
  quantity: z.number().positive().optional(),
  unitPrice: z.number().nonnegative().optional(),
  amount: z.number().nonnegative().optional(),
  isOrphaned: z.boolean().optional(),
  // Audit fields
  auditComment: z.string().min(10, 'Audit comment must be at least 10 characters long')
})

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/transactions/[id] - Get a single transaction
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const url = new URL(request.url)
    const includeAuditTrail = url.searchParams.get('includeAuditTrail') === 'true'
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      )
    }
    
    const transaction = await transactionService.getById(id)
    
    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Fetch resident and house information
    const supabase = await createClient()
    
    const { data: resident } = await supabase
      .from('residents')
      .select('first_name, last_name, house_id')
      .eq('id', transaction.residentId)
      .single()

    let houseName = 'Unknown'
    if (resident?.house_id) {
      const { data: house } = await supabase
        .from('houses')
        .select('descriptor')
        .eq('id', resident.house_id)
        .single()
      
      if (house) {
        houseName = house.descriptor || 'Unknown'
      }
    }

    const residentName = resident 
      ? `${resident.first_name} ${resident.last_name}`
      : 'Unknown'
    
    const response: any = {
      success: true,
      data: {
        ...transaction,
        residentName,
        houseName
      }
    }
    
    // Include audit trail if requested
    if (includeAuditTrail) {
      try {
        const auditTrail = await transactionService.getAuditTrail(id)
        response.auditTrail = auditTrail
      } catch (error) {
        console.error('Error fetching audit trail:', error)
        // Don't fail the request if audit trail fails
        response.auditTrail = []
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error fetching transaction:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT /api/transactions/[id] - Update a transaction (draft only)
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    
    // Validate input
    const result = updateTransactionSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid transaction data',
          details: result.error.errors
        },
        { status: 400 }
      )
    }
    
    const updates = result.data
    
    // Update the transaction using the service
    const transaction = await transactionService.update(id, updates, 'current-user')
    
    return NextResponse.json({
      success: true,
      data: transaction
    })
    
  } catch (error) {
    console.error('Error updating transaction:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Transaction not found') {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 }
        )
      }
      if (error.message === 'Can only update draft transactions') {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/transactions/[id] - Delete a transaction (draft only)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      )
    }
    
    await transactionService.delete(id)
    
    // Add delay for loading state demonstration
    await new Promise(resolve => setTimeout(resolve, 150))
    
    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting transaction:', error)
    
    if (error instanceof Error && error.message === 'Can only delete draft transactions') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}