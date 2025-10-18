import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { getCurrentUserId, logAction, getRequestMetadata } from 'lib/services/audit-logger'
import { getCurrentUserOrganizationId } from 'lib/utils/organization'
import { z } from 'zod'

const createClaimSchema = z.object({
  residentId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  includeAll: z.boolean().optional()
})

/**
 * GET /api/claims
 * Fetch all claims
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
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
        file_path,
        file_generated_at,
        file_generated_by,
        users!claims_created_by_fkey (
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching claims:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch claims' },
        { status: 500 }
      )
    }

    // Format response
    const claims = (data || []).map((claim: any) => ({
      id: claim.id,
      claimNumber: claim.claim_number,
      createdBy: claim.users ? `${claim.users.first_name} ${claim.users.last_name}` : 'System',
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
      fileGeneratedBy: claim.file_generated_by
    }))

    return NextResponse.json({
      success: true,
      data: claims
    })

  } catch (error) {
    console.error('Error fetching claims:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/claims
 * Create a new claim and link eligible transactions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = createClaimSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { residentId, dateFrom, dateTo, includeAll } = validation.data

    const supabase = await createClient()
    const userId = await getCurrentUserId()
    const metadata = getRequestMetadata(request)

    // Get organization context
    const organizationId = await getCurrentUserOrganizationId()
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'User organization not found' },
        { status: 401 }
      )
    }

    // Generate claim number
    const { data: claimNumberData, error: claimNumberError } = await supabase
      .rpc('generate_claim_number')

    if (claimNumberError || !claimNumberData) {
      console.error('Error generating claim number:', claimNumberError)
      return NextResponse.json(
        { success: false, error: 'Failed to generate claim number' },
        { status: 500 }
      )
    }

    const claimNumber = claimNumberData as string

    // Create claim record
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .insert({
        claim_number: claimNumber,
        created_by: userId,
        organization_id: organizationId,
        filters_json: {
          residentId,
          dateFrom,
          dateTo,
          includeAll
        },
        status: 'draft'
      })
      .select()
      .single()

    if (claimError) {
      console.error('Error creating claim:', claimError)
      return NextResponse.json(
        { success: false, error: 'Failed to create claim' },
        { status: 500 }
      )
    }

    // Fetch eligible transactions (status = 'draft')
    let query = supabase
      .from('transactions')
      .select('id, amount')
      .eq('status', 'draft')

    if (residentId) {
      query = query.eq('resident_id', residentId)
    }

    if (dateFrom) {
      query = query.gte('occurred_at', dateFrom)
    }

    if (dateTo) {
      // Add end of day to make the date range inclusive
      const endOfDay = new Date(dateTo)
      endOfDay.setHours(23, 59, 59, 999)
      query = query.lte('occurred_at', endOfDay.toISOString())
    }

    const { data: eligibleTransactions, error: txError } = await query

    if (txError) {
      console.error('Error fetching eligible transactions:', txError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch eligible transactions' },
        { status: 500 }
      )
    }

    if (!eligibleTransactions || eligibleTransactions.length === 0) {
      // Delete the claim if no transactions found
      await supabase.from('claims').delete().eq('id', claim.id)
      
      return NextResponse.json(
        { success: false, error: 'No eligible transactions found for the selected filters' },
        { status: 400 }
      )
    }

    // Update all eligible transactions to 'picked_up' and link to claim
    const transactionIds = eligibleTransactions.map((tx: any) => tx.id)
    
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'picked_up',
        claim_id: claim.id
      })
      .in('id', transactionIds)

    if (updateError) {
      console.error('Error updating transactions:', updateError)
      // Rollback: delete the claim
      await supabase.from('claims').delete().eq('id', claim.id)
      
      return NextResponse.json(
        { success: false, error: 'Failed to link transactions to claim' },
        { status: 500 }
      )
    }

    // The trigger will auto-update transaction_count and total_amount
    // Fetch the updated claim
    const { data: updatedClaim } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claim.id)
      .single()

    // Log the action
    if (userId) {
      await logAction({
        userId,
        entityType: 'claim' as any,
        entityId: claim.id,
        action: 'create',
        details: {
          claimNumber,
          transactionCount: eligibleTransactions.length,
          totalAmount: eligibleTransactions.reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0),
          filters: { residentId, dateFrom, dateTo, includeAll }
        },
        ...metadata
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        claim: updatedClaim,
        transactionCount: eligibleTransactions.length
      },
      message: `Claim ${claimNumber} created with ${eligibleTransactions.length} transaction${eligibleTransactions.length !== 1 ? 's' : ''}`
    })

  } catch (error) {
    console.error('Error creating claim:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

