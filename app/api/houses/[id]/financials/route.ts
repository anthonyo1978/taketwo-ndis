import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { getCurrentUserOrganizationId } from 'lib/utils/organization'

/**
 * GET /api/houses/[id]/financials
 *
 * Returns monthly income (NDIS transactions) and expenses for a house,
 * grouped by month.
 *
 * Query params:
 *   months – number of months to look back. 0 or omitted = all time.
 *
 * Response shape:
 * {
 *   success: true,
 *   data: {
 *     months: [
 *       { month: "2025-03", label: "Mar 2025", shortLabel: "Mar", income: 5200, expenses: 1000 },
 *       ...
 *     ],
 *     totals: { income: 62400, expenses: 12000, net: 50400 },
 *     notables: [
 *       { month: "May 2025", type: "expense", amount: 4500, description: "Insurance premium", category: "insurance" },
 *       ...
 *     ]
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
    const monthsParam = searchParams.get('months')
    // 0 or missing = all time
    const monthsBack = monthsParam ? parseInt(monthsParam, 10) : 0

    const supabase = await createClient()

    // Calculate date range — if monthsBack === 0, no lower bound (all time)
    const now = new Date()
    let startISO: string | null = null
    if (monthsBack > 0) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1)
      startISO = startDate.toISOString()
    }

    // ── 1. Income: Get transactions for residents in this house ──
    const { data: residents } = await supabase
      .from('residents')
      .select('id')
      .eq('house_id', houseId)
      .eq('organization_id', organizationId)

    const residentIds = residents?.map(r => r.id) || []

    let incomeRows: { occurred_at: string; amount: string }[] = []
    if (residentIds.length > 0) {
      let txnQuery = supabase
        .from('transactions')
        .select('occurred_at, amount')
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

    // ── 2. Expenses: Get house expenses (with description + category for notables) ──
    let expQuery = supabase
      .from('house_expenses')
      .select('occurred_at, amount, description, category')
      .eq('house_id', houseId)
      .eq('organization_id', organizationId)
      .not('status', 'eq', 'cancelled')

    if (startISO) {
      expQuery = expQuery.gte('occurred_at', startISO)
    }

    const { data: expenseRows, error: expError } = await expQuery

    if (expError) {
      console.error('[Financials] Error fetching expenses:', expError)
    }

    // ── 3. Determine the effective start month ──
    // For all-time, derive from the earliest data point
    let effectiveStart: Date
    if (monthsBack > 0) {
      effectiveStart = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1)
    } else {
      // Find the earliest date across income and expenses
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

    // ── 4. Build monthly buckets ──
    const monthMap = new Map<string, { income: number; expenses: number }>()

    // Pre-fill all months from effectiveStart to now
    const cursor = new Date(effectiveStart)
    while (cursor <= now) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
      monthMap.set(key, { income: 0, expenses: 0 })
      cursor.setMonth(cursor.getMonth() + 1)
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
    totals.income = Math.round(totals.income * 100) / 100
    totals.expenses = Math.round(totals.expenses * 100) / 100
    totals.net = Math.round(totals.net * 100) / 100

    // ── 5. Detect notable items ──
    // A "notable" is any single expense or income month that is ≥ 2× the
    // average for its type, AND the absolute value is meaningful (≥ $500).
    // We also surface the largest individual expense per notable month.
    const notables: {
      month: string
      type: 'income' | 'expense'
      amount: number
      description?: string
      category?: string
    }[] = []

    const avgIncome = months.length > 0
      ? months.reduce((s, m) => s + m.income, 0) / months.length
      : 0
    const avgExpenses = months.length > 0
      ? months.reduce((s, m) => s + m.expenses, 0) / months.length
      : 0

    for (const m of months) {
      // Notable high income month
      if (m.income > 0 && avgIncome > 0 && m.income >= avgIncome * 2 && m.income >= 500) {
        notables.push({
          month: m.label,
          type: 'income',
          amount: m.income,
          description: `Income was ${Math.round(m.income / avgIncome)}× the monthly average`,
        })
      }
      // Notable high expense month
      if (m.expenses > 0 && avgExpenses > 0 && m.expenses >= avgExpenses * 2 && m.expenses >= 500) {
        // Find the largest individual expense in this month
        const monthKey = m.month
        let biggestExpense: { amount: number; description: string; category: string } | null = null
        for (const row of (expenseRows || [])) {
          const d = new Date(row.occurred_at)
          const rowKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          if (rowKey === monthKey) {
            const amt = parseFloat(row.amount) || 0
            if (!biggestExpense || amt > biggestExpense.amount) {
              biggestExpense = {
                amount: amt,
                description: row.description || 'Expense',
                category: row.category || 'other',
              }
            }
          }
        }

        notables.push({
          month: m.label,
          type: 'expense',
          amount: m.expenses,
          description: biggestExpense
            ? `Largest item: ${biggestExpense.description} ($${biggestExpense.amount.toLocaleString('en-AU', { minimumFractionDigits: 0 })})`
            : `Expenses were ${Math.round(m.expenses / avgExpenses)}× the monthly average`,
          category: biggestExpense?.category,
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: { months, totals, notables },
    })
  } catch (error) {
    console.error('[API] Error fetching house financials:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch financial data' },
      { status: 500 }
    )
  }
}
