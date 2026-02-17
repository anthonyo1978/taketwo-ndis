import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'

/**
 * GET /api/residents/[id]/claim-summary
 *
 * Returns monthly aggregated transaction data for a resident:
 *   - totalAmount per month
 *   - count of individual transactions (claims) per month
 *
 * Query params:
 *   months  – 0 = all time (default), or 3 / 6 / 12
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: residentId } = await params
    const { searchParams } = new URL(request.url)
    const monthsParam = parseInt(searchParams.get('months') || '0', 10)

    const supabase = await createClient()

    // ── 0. Fetch resident to get move-in date (and house go-live date) ──
    const { data: residentData } = await supabase
      .from('residents')
      .select('move_in_date, house_id')
      .eq('id', residentId)
      .single()

    let moveInDate: Date | null = null
    if (residentData?.move_in_date) {
      moveInDate = new Date(residentData.move_in_date)
    }

    // If resident has a house, also get the house go-live date as a fallback
    let houseGoLiveDate: Date | null = null
    if (residentData?.house_id) {
      const { data: houseData } = await supabase
        .from('houses')
        .select('go_live_date')
        .eq('id', residentData.house_id)
        .single()
      if (houseData?.go_live_date) {
        houseGoLiveDate = new Date(houseData.go_live_date)
      }
    }

    // The effective anchor date: move-in date > house go-live > null
    const anchorDate = moveInDate || houseGoLiveDate

    // ── 1. Determine date range ──
    let startISO: string | null = null

    if (monthsParam > 0) {
      const start = new Date()
      start.setMonth(start.getMonth() - monthsParam)
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      // Don't go earlier than the anchor date
      if (anchorDate) {
        const anchorMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
        startISO = (anchorMonth > start ? anchorMonth : start).toISOString()
      } else {
        startISO = start.toISOString()
      }
    }

    // ── 2. Fetch transactions for this resident ──
    let query = supabase
      .from('transactions')
      .select('occurred_at, amount, status, service_code')
      .eq('resident_id', residentId)
      .not('status', 'in', '("rejected","error")')
      .order('occurred_at', { ascending: true })

    if (startISO) {
      query = query.gte('occurred_at', startISO)
    }

    const { data: transactions, error } = await query

    if (error) {
      console.error('Error fetching resident transactions:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch transaction data' },
        { status: 500 }
      )
    }

    // ── 3. Aggregate by month ──
    const monthMap = new Map<string, { amount: number; count: number }>()

    for (const tx of transactions || []) {
      const d = new Date(tx.occurred_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

      const entry = monthMap.get(key) || { amount: 0, count: 0 }
      entry.amount += parseFloat(tx.amount)
      entry.count += 1
      monthMap.set(key, entry)
    }

    // ── 4. Build continuous month array ──
    // Determine the range of months to return
    const now = new Date()
    let rangeStart: Date

    if (monthsParam > 0) {
      const periodStart = new Date(now.getFullYear(), now.getMonth() - monthsParam, 1)
      if (anchorDate) {
        const anchorMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
        rangeStart = anchorMonth > periodStart ? anchorMonth : periodStart
      } else {
        rangeStart = periodStart
      }
    } else if (anchorDate) {
      // All time: start from move-in date / house go-live
      rangeStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
    } else if (transactions && transactions.length > 0) {
      const earliest = new Date(transactions[0]!.occurred_at)
      rangeStart = new Date(earliest.getFullYear(), earliest.getMonth(), 1)
    } else {
      // No transactions at all – return empty
      return NextResponse.json({
        success: true,
        data: {
          months: [],
          totals: { totalAmount: 0, totalClaims: 0 },
        },
      })
    }

    const rangeEnd = new Date(now.getFullYear(), now.getMonth(), 1) // current month start

    const months: {
      month: string
      label: string
      shortLabel: string
      amount: number
      count: number
    }[] = []

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ]
    const shortMonthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ]

    const cursor = new Date(rangeStart)
    while (cursor <= rangeEnd) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
      const entry = monthMap.get(key) || { amount: 0, count: 0 }

      months.push({
        month: key,
        label: `${monthNames[cursor.getMonth()]} ${cursor.getFullYear()}`,
        shortLabel: `${shortMonthNames[cursor.getMonth()]} ${String(cursor.getFullYear()).slice(-2)}`,
        amount: Math.round(entry.amount * 100) / 100,
        count: entry.count,
      })

      cursor.setMonth(cursor.getMonth() + 1)
    }

    // ── 5. Totals ──
    const totalAmount = months.reduce((s, m) => s + m.amount, 0)
    const totalClaims = months.reduce((s, m) => s + m.count, 0)

    return NextResponse.json({
      success: true,
      data: {
        months,
        totals: {
          totalAmount: Math.round(totalAmount * 100) / 100,
          totalClaims,
        },
      },
    })
  } catch (err) {
    console.error('Error in claim-summary API:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

