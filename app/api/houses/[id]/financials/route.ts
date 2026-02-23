import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { getCurrentUserOrganizationId } from 'lib/utils/organization'

/**
 * GET /api/houses/[id]/financials
 *
 * Returns monthly income (NDIS transactions) and expenses for a house,
 * grouped by month.  When `detailed=1` is passed, each month also includes
 * a per-resident income breakdown and per-category expense breakdown.
 *
 * Query params:
 *   months   – number of months to look back. 0 or omitted = all time.
 *   detailed – if "1", include residentBreakdown + expenseBreakdown per month.
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
    const monthsParam = searchParams.get('months')
    const detailed = searchParams.get('detailed') === '1'
    const monthsBack = monthsParam ? parseInt(monthsParam, 10) : 0

    const supabase = await createClient()

    // ── 0. Fetch the house to get go_live_date ──
    const { data: house } = await supabase
      .from('houses')
      .select('go_live_date')
      .eq('id', houseId)
      .eq('organization_id', organizationId)
      .single()

    const goLiveDate = house?.go_live_date ? new Date(house.go_live_date) : null

    const now = new Date()
    let startISO: string | null = null
    if (monthsBack > 0) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1)
      // If go-live date is later than the calculated start, use go-live date
      if (goLiveDate && goLiveDate > startDate) {
        startISO = new Date(goLiveDate.getFullYear(), goLiveDate.getMonth(), 1).toISOString()
      } else {
        startISO = startDate.toISOString()
      }
    }

    // ── 1. Residents in this house ──
    const { data: residents } = await supabase
      .from('residents')
      .select('id, first_name, last_name')
      .eq('house_id', houseId)
      .eq('organization_id', organizationId)

    const residentIds = residents?.map(r => r.id) || []
    const residentNameMap = new Map<string, string>()
    for (const r of (residents || [])) {
      residentNameMap.set(r.id, `${r.first_name || ''} ${r.last_name || ''}`.trim())
    }

    // ── 2. Income: transactions ──
    // Always fetch resident_id so we can optionally break down by resident
    let incomeRows: { occurred_at: string; amount: string; resident_id: string }[] = []
    if (residentIds.length > 0) {
      let txnQuery = supabase
        .from('transactions')
        .select('occurred_at, amount, resident_id')
        .in('resident_id', residentIds)
        .not('status', 'in', '("rejected")')

      if (startISO) {
        txnQuery = txnQuery.gte('occurred_at', startISO)
      }

      const { data: txns, error: txnError } = await txnQuery
      if (txnError) {
        console.error('[Financials] Error fetching transactions:', txnError)
      } else {
        incomeRows = txns || []
      }
    }

    // ── 3. Expenses (property-scoped only for house view) ──
    let expQuery = supabase
      .from('house_expenses')
      .select('occurred_at, amount, description, category')
      .eq('house_id', houseId)
      .eq('organization_id', organizationId)
      .eq('scope', 'property')
      .not('status', 'eq', 'cancelled')

    if (startISO) {
      expQuery = expQuery.gte('occurred_at', startISO)
    }

    const { data: expenseRows, error: expError } = await expQuery
    if (expError) {
      console.error('[Financials] Error fetching expenses:', expError)
    }

    // ── 4. Determine effective start month ──
    // For "All Time" (monthsBack === 0), start from the house go-live date.
    // For fixed periods, start from the calculated month but never before go-live.
    let effectiveStart: Date
    if (monthsBack > 0) {
      const periodStart = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1)
      if (goLiveDate) {
        const goLiveMonth = new Date(goLiveDate.getFullYear(), goLiveDate.getMonth(), 1)
        effectiveStart = goLiveMonth > periodStart ? goLiveMonth : periodStart
      } else {
        effectiveStart = periodStart
      }
    } else {
      // All time: use go-live date, or fall back to earliest data point
      if (goLiveDate) {
        effectiveStart = new Date(goLiveDate.getFullYear(), goLiveDate.getMonth(), 1)
      } else {
        let earliest = now
        for (const row of incomeRows) {
          const d = new Date(row.occurred_at)
          if (d < earliest) earliest = d
        }
        for (const row of (expenseRows || [])) {
          const d = new Date(row.occurred_at)
          if (d < earliest) earliest = d
        }
        effectiveStart = new Date(earliest.getFullYear(), earliest.getMonth(), 1)
      }
    }

    // ── 5. Build monthly buckets ──
    interface ResidentAmount { name: string; amount: number }
    interface CategoryAmount { category: string; amount: number; topItem?: string }
    interface MonthBucket {
      income: number
      expenses: number
      residentBreakdown: Map<string, { name: string; amount: number }>
      expenseByCategory: Map<string, { amount: number; topItem: string; topAmount: number }>
    }

    const monthMap = new Map<string, MonthBucket>()

    const cursor = new Date(effectiveStart)
    while (cursor <= now) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
      monthMap.set(key, {
        income: 0,
        expenses: 0,
        residentBreakdown: new Map(),
        expenseByCategory: new Map(),
      })
      cursor.setMonth(cursor.getMonth() + 1)
    }

    // Aggregate income
    for (const row of incomeRows) {
      const d = new Date(row.occurred_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const bucket = monthMap.get(key)
      if (!bucket) continue
      const amt = parseFloat(row.amount) || 0
      bucket.income += amt

      // Per-resident breakdown (only when detailed + resident_id available)
      if (detailed && row.resident_id) {
        const existing = bucket.residentBreakdown.get(row.resident_id)
        if (existing) {
          existing.amount += amt
        } else {
          bucket.residentBreakdown.set(row.resident_id, {
            name: residentNameMap.get(row.resident_id) || 'Unknown',
            amount: amt,
          })
        }
      }
    }

    // Aggregate expenses
    for (const row of (expenseRows || [])) {
      const d = new Date(row.occurred_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const bucket = monthMap.get(key)
      if (!bucket) continue
      const amt = parseFloat(row.amount) || 0
      bucket.expenses += amt

      // Per-category breakdown (only when detailed)
      if (detailed) {
        const cat = row.category || 'other'
        const existing = bucket.expenseByCategory.get(cat)
        if (existing) {
          existing.amount += amt
          if (amt > existing.topAmount) {
            existing.topItem = row.description || cat
            existing.topAmount = amt
          }
        } else {
          bucket.expenseByCategory.set(cat, {
            amount: amt,
            topItem: row.description || cat,
            topAmount: amt,
          })
        }
      }
    }

    // Convert to sorted array
    const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    const months = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, bucket]) => {
        const parts = key.split('-')
        const year = parts[0]
        const month = parts[1] || '01'
        const monthIdx = parseInt(month, 10) - 1

        const base: any = {
          month: key,
          label: `${SHORT_MONTHS[monthIdx]} ${year}`,
          shortLabel: SHORT_MONTHS[monthIdx],
          income: Math.round(bucket.income * 100) / 100,
          expenses: Math.round(bucket.expenses * 100) / 100,
        }

        if (detailed) {
          // Resident breakdown sorted by amount descending
          base.residentBreakdown = Array.from(bucket.residentBreakdown.values())
            .map(r => ({ name: r.name, amount: Math.round(r.amount * 100) / 100 }))
            .sort((a, b) => b.amount - a.amount)

          // Expense category breakdown sorted by amount descending
          base.expenseBreakdown = Array.from(bucket.expenseByCategory.entries())
            .map(([cat, data]) => ({
              category: cat,
              amount: Math.round(data.amount * 100) / 100,
              topItem: data.topItem,
            }))
            .sort((a, b) => b.amount - a.amount)
        }

        return base
      })

    // Totals (property-level: gross profit = income - property expenses)
    const totalIncome = months.reduce((sum, m) => sum + m.income, 0)
    const totalExpenses = months.reduce((sum, m) => sum + m.expenses, 0)
    const totals = {
      income: Math.round(totalIncome * 100) / 100,
      expenses: Math.round(totalExpenses * 100) / 100,
      net: Math.round((totalIncome - totalExpenses) * 100) / 100,
      grossProfit: Math.round((totalIncome - totalExpenses) * 100) / 100,
    }

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
