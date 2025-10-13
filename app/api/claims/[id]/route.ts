import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'

/**
 * GET /api/claims/[id]
 * Get a specific claim with its linked transactions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get claim details
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select(`
        id,
        claim_number,
        created_by,
        created_at,
        filters_json,
        transaction_count,
        total_amount,
        status,
        submitted_at,
        submitted_by,
        updated_at,
        users!claims_created_by_fkey (
          first_name,
          last_name
        )
      `)
      .eq('id', id)
      .single()

    if (claimError || !claim) {
      return NextResponse.json(
        { success: false, error: 'Claim not found' },
        { status: 404 }
      )
    }

    // Get linked transactions
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select(`
        id,
        resident_id,
        occurred_at,
        amount,
        service_code,
        note,
        status,
        residents!transactions_resident_id_fkey (
          first_name,
          last_name
        )
      `)
      .eq('claim_id', id)
      .order('occurred_at', { ascending: false })

    if (txError) {
      console.error('Error fetching transactions:', txError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    // Format response
    const user = (claim as any).users
    const formattedClaim = {
      id: claim.id,
      claimNumber: claim.claim_number,
      createdBy: user ? `${user.first_name} ${user.last_name}` : 'System',
      createdAt: claim.created_at,
      filtersJson: claim.filters_json,
      transactionCount: claim.transaction_count,
      totalAmount: claim.total_amount,
      status: claim.status,
      submittedAt: claim.submitted_at,
      submittedBy: claim.submitted_by,
      updatedAt: claim.updated_at,
      filePath: claim.file_path,
      fileGeneratedAt: claim.file_generated_at,
      fileGeneratedBy: claim.file_generated_by,
      transactions: (transactions || []).map((tx: any) => ({
        id: tx.id,
        residentId: tx.resident_id,
        residentName: tx.residents ? `${tx.residents.first_name} ${tx.residents.last_name}` : 'Unknown',
        occurredAt: tx.occurred_at,
        amount: tx.amount,
        serviceCode: tx.service_code,
        note: tx.note,
        status: tx.status
      }))
    }

    return NextResponse.json({
      success: true,
      data: formattedClaim
    })

  } catch (error) {
    console.error('Error fetching claim:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

