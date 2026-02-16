import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { getCurrentUserOrganizationId } from 'lib/utils/organization'

/**
 * GET /api/dashboard/financials
 *
 * Returns org-wide monthly income vs expenses, optionally filtered by house.
 *
 * Query params:
 *   months  – number of months to look back (default 12)
 *   houseId – optional, filter to a single house
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     months: [{ month, label, shortLabel, income, expenses }],
 *     totals: { income, expenses, net },
 *     byHouse: [{ houseId, houseName, income, expenses, net }]   // portfolio breakdown
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const organizationId = await getCurrentUserOrganizationId()
    if (!organizationId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const monthsBack = parseInt(searchParams.get('months') || '12', 10)
    const filterHouseId = searchParams.get('houseId') || null

    const supabase = await createClient()

    // Date range
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1)
    const startISO = startDate.toISOString()

    // ── 1. Get all houses in the org ──
    let housesQuery = supabase
      .from('houses')
      .select('id, descriptor, address1, suburb')
      .eq('organization_id', organizationId)

    if (filterHouseId) {
      housesQuery = housesQuery.eq('id', filterHouseId)
    }

    const { data: houses } = await housesQuery
    const houseIds = houses?.map(h => h.id) || []
    const houseNameMap = new Map<string, string>()
    for (const h of (houses || [])) {
      houseNameMap.set(h.id, h.descriptor || h.address1 || h.suburb || 'Unknown')
    }

    // ── 2. Income: transactions for residents in those houses ──
    let incomeRows: { occurred_at: string; amount: string; house_id: string | null }[] = []
    if (houseIds.length > 0) {
      // Get residents in scope houses
      let residentsQuery = supabase
        .from('residents')
        .select('id, house_id')
        .eq('organization_id', organizationId)

      if (filterHouseId) {
        residentsQuery = residentsQuery.eq('house_id', filterHouseId)
      } else {
        residentsQuery = residentsQuery.in('house_id', houseIds)
      }

      const { data: residents } = await residentsQuery
      const residentIds = residents?.map(r => r.id) || []
      const residentHouseMap = new Map<string, string>()
      for (const r of (residents || [])) {
        if (r.house_id) residentHouseMap.set(r.id, r.house_id)
      }

      if (residentIds.length > 0) {
        // Fetch in batches if needed (Supabase has a limit on IN clauses)
        const batchSize = 100
        for (let i = 0; i < residentIds.length; i += batchSize) {
          const batch = residentIds.slice(i, i + batchSize)
          const { data: txns } = await supabase
            .from('transactions')
            .select('occurred_at, amount, resident_id')
            .in('resident_id', batch)
            .gte('occurred_at', startISO)
            .not('status', 'in', '("rejected")')

          for (const tx of (txns || [])) {
            incomeRows.push({
              occurred_at: tx.occurred_at,
              amount: tx.amount,
              house_id: residentHouseMap.get(tx.resident_id) || null,
            })
          }
        }
      }
    }

    // ── 3. Expenses: house_expenses for those houses ──
    let expenseQuery = supabase
      .from('house_expenses')
      .select('occurred_at, amount, house_id')
      .eq('organization_id', organizationId)
      .gte('occurred_at', startISO)
      .not('status', 'eq', 'cancelled')

    if (filterHouseId) {
      expenseQuery = expenseQuery.eq('house_id', filterHouseId)
    }

    const { data: expenseRows } = await expenseQuery

    // ── 4. Build monthly buckets ──
    const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthMap = new Map<string, { income: number; expenses: number }>()

    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1 + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap.set(key, { income: 0, expenses: 0 })
    }

    // Per-house aggregation
    const houseAgg = new Map<string, { income: number; expenses: number }>()
    for (const hId of houseIds) {
      houseAgg.set(hId, { income: 0, expenses: 0 })
    }

    // Aggregate income
    for (const row of incomeRows) {
      const d = new Date(row.occurred_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const amt = parseFloat(row.amount) || 0
      const bucket = monthMap.get(key)
      if (bucket) bucket.income += amt
      if (row.house_id) {
        const hBucket = houseAgg.get(row.house_id)
        if (hBucket) hBucket.income += amt
      }
    }

    // Aggregate expenses
    for (const row of (expenseRows || [])) {
      const d = new Date(row.occurred_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const amt = parseFloat(row.amount) || 0
      const bucket = monthMap.get(key)
      if (bucket) bucket.expenses += amt
      if (row.house_id) {
        const hBucket = houseAgg.get(row.house_id)
        if (hBucket) hBucket.expenses += amt
      }
    }

    // Convert monthly buckets to sorted array
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
          shortLabel: SHORT_MONTHS[monthIdx] || '',
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

    // Per-house breakdown
    const byHouse = Array.from(houseAgg.entries())
      .map(([hId, vals]) => ({
        houseId: hId,
        houseName: houseNameMap.get(hId) || 'Unknown',
        income: Math.round(vals.income * 100) / 100,
        expenses: Math.round(vals.expenses * 100) / 100,
        net: Math.round((vals.income - vals.expenses) * 100) / 100,
      }))
      .sort((a, b) => b.net - a.net) // Best-performing first

    return NextResponse.json({
      success: true,
      data: { months, totals, byHouse },
    })
  } catch (error) {
    console.error('[Dashboard Financials] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch financial data' },
      { status: 500 }
    )
  }
}

