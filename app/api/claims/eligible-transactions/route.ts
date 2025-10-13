import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'

/**
 * GET /api/claims/eligible-transactions
 * Fetch transactions eligible for claiming (status = 'draft')
 * Supports filtering by resident and date range
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const residentId = searchParams.get('residentId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const supabase = await createClient()

    // Build query for eligible transactions (status = 'draft' only)
    let query = supabase
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
      .eq('status', 'draft')
      .order('occurred_at', { ascending: false })

    // Apply filters
    if (residentId) {
      query = query.eq('resident_id', residentId)
    }

    if (dateFrom) {
      query = query.gte('occurred_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('occurred_at', dateTo)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching eligible transactions:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch eligible transactions' },
        { status: 500 }
      )
    }

    // Format response
    const transactions = (data || []).map((tx: any) => ({
      id: tx.id,
      residentId: tx.resident_id,
      residentName: tx.residents ? `${tx.residents.first_name} ${tx.residents.last_name}` : 'Unknown',
      occurredAt: tx.occurred_at,
      amount: tx.amount,
      serviceCode: tx.service_code,
      note: tx.note,
      status: tx.status
    }))

    const totalAmount = transactions.reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0)

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        count: transactions.length,
        totalAmount
      }
    })

  } catch (error) {
    console.error('Error fetching eligible transactions:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

