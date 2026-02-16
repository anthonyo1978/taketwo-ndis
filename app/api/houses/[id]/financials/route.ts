import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { getCurrentUserOrganizationId } from 'lib/utils/organization'

/**
 * GET /api/houses/[id]/financials
 *
 * Returns monthly income (NDIS transactions) and expenses for a house,
 * grouped by month, for the last N months (default 12).
 *
 * Response shape:
 * {
 *   success: true,
 *   data: {
 *     months: [
 *       { month: "2025-03", label: "Mar 2025", income: 5200, expenses: 1000 },
 *       ...
 *     ],
 *     totals: { income: 62400, expenses: 12000, net: 50400 }
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: houseId } = await params
    const organizationId = await getCurrentUserOrganizationId()
    if (!organizationId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const monthsBack = parseInt(searchParams.get('months') || '12', 10)

    const supabase = await createClient()

    // Calculate date range
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1)
    const startISO = startDate.toISOString()

    // ── 1. Income: Get transactions for residents in this house ──
    // First get resident IDs for this house
    const { data: residents } = await supabase
      .from('residents')
      .select('id')
      .eq('house_id', houseId)
      .eq('organization_id', organizationId)

    const residentIds = residents?.map(r => r.id) || []

    let incomeRows: { occurred_at: string; amount: string }[] = []
    if (residentIds.length > 0) {
      const { data: txns, error: txnError } = await supabase
        .from('transactions')
        .select('occurred_at, amount')
        .in('resident_id', residentIds)
        .gte('occurred_at', startISO)
        .not('status', 'in', '("rejected")')

      if (txnError) {
        console.error('[Financials] Error fetching transactions:', txnError)
      } else {
        incomeRows = txns || []
      }
    }

    // ── 2. Expenses: Get house expenses ──
    const { data: expenseRows, error: expError } = await supabase
      .from('house_expenses')
      .select('occurred_at, amount')
      .eq('house_id', houseId)
      .eq('organization_id', organizationId)
      .gte('occurred_at', startISO)
      .not('status', 'eq', 'cancelled')

    if (expError) {
      console.error('[Financials] Error fetching expenses:', expError)
    }

    // ── 3. Build monthly buckets ──
    const monthMap = new Map<string, { income: number; expenses: number }>()

    // Pre-fill all months in range
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1 + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap.set(key, { income: 0, expenses: 0 })
    }

    // Aggregate income
    for (const row of incomeRows) {
      const d = new Date(row.occurred_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const bucket = monthMap.get(key)
      if (bucket) {
        bucket.income += parseFloat(row.amount) || 0
      }
    }

    // Aggregate expenses
    for (const row of (expenseRows || [])) {
      const d = new Date(row.occurred_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const bucket = monthMap.get(key)
      if (bucket) {
        bucket.expenses += parseFloat(row.amount) || 0
      }
    }

    // Convert to sorted array
    const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const months = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, values]) => {
        const parts = key.split('-')
        const year = parts[0]
        const month = parts[1] || '01'
        const monthIdx = parseInt(month, 10) - 1
        return {
          month: key,
          label: `${SHORT_MONTHS[monthIdx]} ${year}`,
          shortLabel: SHORT_MONTHS[monthIdx],
          income: Math.round(values.income * 100) / 100,
          expenses: Math.round(values.expenses * 100) / 100,
        }
      })

    // Totals
    const totals = months.reduce(
      (acc, m) => ({
        income: acc.income + m.income,
        expenses: acc.expenses + m.expenses,
        net: acc.income + m.income - (acc.expenses + m.expenses),
      }),
      { income: 0, expenses: 0, net: 0 }
    )
    // Round
    totals.income = Math.round(totals.income * 100) / 100
    totals.expenses = Math.round(totals.expenses * 100) / 100
    totals.net = Math.round(totals.net * 100) / 100

    return NextResponse.json({
      success: true,
      data: { months, totals },
    })
  } catch (error) {
    console.error('[API] Error fetching house financials:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch financial data' },
      { status: 500 }
    )
  }
}

