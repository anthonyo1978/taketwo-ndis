import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'

/**
 * POST /api/claims/[id]/simulate-completion
 * Simulate the completion of payment processing by updating transaction statuses
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get all transactions linked to this claim that are in 'picked_up' status
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id')
      .eq('claim_id', id)
      .eq('status', 'picked_up')

    if (fetchError) {
      console.error('Error fetching transactions:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No transactions to update',
        updatedCount: 0
      })
    }

    // Update all transactions from 'picked_up' to 'paid'
    const transactionIds = transactions.map(tx => tx.id)
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ 
        status: 'paid',
        updated_at: new Date().toISOString()
      })
      .in('id', transactionIds)

    if (updateError) {
      console.error('Error updating transactions:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update transactions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Transactions updated successfully',
      updatedCount: transactions.length
    })

  } catch (error) {
    console.error('Error simulating completion:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
