import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { getCurrentUserOrganizationId } from 'lib/utils/organization'

/**
 * GET /api/dashboard/financials
 *
 * Returns org-wide monthly income vs expenses, optionally filtered by house.
 * When `detailed=1`, each month also includes per-house (or per-resident when
 * filtered to a single house) income breakdown and per-category expense breakdown.
 *
 * Financial model:
 *   Property Gross Profit = Sum(income) - Sum(property expenses) per house
 *   Portfolio Gross Profit = Total Property Income - Total Property Expenses
 *   Net Operating Profit  = Portfolio Gross Profit - Total Organisation Expenses
 *
 * Query params:
 *   months   – number of months to look back. 0 or omitted = all time.
 *   houseId  – optional, filter to a single house.
 *   detailed – if "1", include breakdowns per month.
 */
export async function GET(request: NextRequest) {
  try {
    const organizationId = await getCurrentUserOrganizationId()
    if (!organizationId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const monthsParam = searchParams.get('months')
    const monthsBack = monthsParam ? parseInt(monthsParam, 10) : 0
    const filterHouseId = searchParams.get('houseId') || null
    const detailed = searchParams.get('detailed') === '1'

    const supabase = await createClient()

    const now = new Date()
    let startISO: string | null = null
    if (monthsBack > 0) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1)
      startISO = startDate.toISOString()
    }

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
    let residentsQuery = supabase
      .from('residents')
      .select('id, house_id, first_name, last_name')
      .eq('organization_id', organizationId)

    if (filterHouseId) {
      residentsQuery = residentsQuery.eq('house_id', filterHouseId)
    } else if (houseIds.length > 0) {
      residentsQuery = residentsQuery.in('house_id', houseIds)
    }

    const { data: residents } = await residentsQuery
    const residentIds = residents?.map(r => r.id) || []
    const residentHouseMap = new Map<string, string>()
    const residentNameMap = new Map<string, string>()
    for (const r of (residents || [])) {
      if (r.house_id) residentHouseMap.set(r.id, r.house_id)
      residentNameMap.set(r.id, `${r.first_name || ''} ${r.last_name || ''}`.trim())
    }

    interface IncomeRow {
      occurred_at: string
      amount: string
      resident_id: string
      house_id: string | null
    }

    const incomeRows: IncomeRow[] = []
    if (residentIds.length > 0) {
      const batchSize = 100
      for (let i = 0; i < residentIds.length; i += batchSize) {
        const batch = residentIds.slice(i, i + batchSize)
        let txnQuery = supabase
          .from('transactions')
          .select('occurred_at, amount, resident_id')
          .in('resident_id', batch)
          .not('status', 'in', '("rejected")')

        if (startISO) {
          txnQuery = txnQuery.gte('occurred_at', startISO)
        }

        const { data: txns } = await txnQuery

        for (const tx of (txns || [])) {
          incomeRows.push({
            occurred_at: tx.occurred_at,
            amount: tx.amount,
            resident_id: tx.resident_id,
            house_id: residentHouseMap.get(tx.resident_id) || null,
          })
        }
      }
    }

    // ── 3. Expenses (property + organisation) ──
    let expenseQuery = supabase
      .from('house_expenses')
      .select('occurred_at, amount, house_id, description, category, scope')
      .eq('organization_id', organizationId)
      .not('status', 'eq', 'cancelled')

    if (startISO) {
      expenseQuery = expenseQuery.gte('occurred_at', startISO)
    }

    if (filterHouseId) {
      // When filtering by house, only show property expenses for that house
      expenseQuery = expenseQuery.eq('house_id', filterHouseId)
    }

    const { data: expenseRows } = await expenseQuery

    // Also fetch org-level expenses separately (they have no house_id)
    let orgExpenseRows: typeof expenseRows = []
    if (!filterHouseId) {
      let orgQuery = supabase
        .from('house_expenses')
        .select('occurred_at, amount, house_id, description, category, scope')
        .eq('organization_id', organizationId)
        .eq('scope', 'organisation')
        .not('status', 'eq', 'cancelled')

      if (startISO) {
        orgQuery = orgQuery.gte('occurred_at', startISO)
      }

      const { data: orgRows } = await orgQuery
      orgExpenseRows = orgRows || []
    }

    // Combine: property expenses from main query + org expenses
    // (Avoid double-counting: main query may already include org expenses if no houseId filter)
    const allExpenseRows = filterHouseId
      ? (expenseRows || [])
      : [...(expenseRows || []).filter((r: any) => r.scope !== 'organisation'), ...orgExpenseRows]

    // ── 4. Determine effective start month ──
    let effectiveStart: Date
    if (monthsBack > 0) {
      effectiveStart = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1)
    } else {
      let earliest = now
      for (const row of incomeRows) {
        const d = new Date(row.occurred_at)
        if (d < earliest) earliest = d
      }
      for (const row of allExpenseRows) {
        const d = new Date(row.occurred_at)
        if (d < earliest) earliest = d
      }
      effectiveStart = new Date(earliest.getFullYear(), earliest.getMonth(), 1)
    }

    // ── 5. Build monthly buckets ──
    const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    interface MonthBucket {
      income: number
      propertyExpenses: number
      orgExpenses: number
      incomeBySource: Map<string, { name: string; amount: number }>
      expenseByCategory: Map<string, { amount: number; topItem: string; topAmount: number }>
    }

    const monthMap = new Map<string, MonthBucket>()

    const cursor = new Date(effectiveStart)
    while (cursor <= now) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
      monthMap.set(key, {
        income: 0,
        propertyExpenses: 0,
        orgExpenses: 0,
        incomeBySource: new Map(),
        expenseByCategory: new Map(),
      })
      cursor.setMonth(cursor.getMonth() + 1)
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
      if (bucket) {
        bucket.income += amt

        if (detailed) {
          const sourceId = filterHouseId ? row.resident_id : (row.house_id || 'unknown')
          const sourceName = filterHouseId
            ? (residentNameMap.get(row.resident_id) || 'Unknown')
            : (row.house_id ? (houseNameMap.get(row.house_id) || 'Unknown') : 'Unknown')

          const existing = bucket.incomeBySource.get(sourceId)
          if (existing) {
            existing.amount += amt
          } else {
            bucket.incomeBySource.set(sourceId, { name: sourceName, amount: amt })
          }
        }
      }
      if (row.house_id) {
        const hBucket = houseAgg.get(row.house_id)
        if (hBucket) hBucket.income += amt
      }
    }

    // Aggregate expenses (split by scope)
    for (const row of allExpenseRows) {
      const d = new Date(row.occurred_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const amt = parseFloat(row.amount) || 0
      const scope = (row as any).scope || 'property'
      const bucket = monthMap.get(key)
      if (bucket) {
        if (scope === 'organisation') {
          bucket.orgExpenses += amt
        } else {
          bucket.propertyExpenses += amt
        }

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
      if (row.house_id && scope === 'property') {
        const hBucket = houseAgg.get(row.house_id)
        if (hBucket) hBucket.expenses += amt
      }
    }

    // Convert monthly buckets to sorted array
    const months = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, bucket]) => {
        const parts = key.split('-')
        const year = parts[0]
        const month = parts[1] || '01'
        const monthIdx = parseInt(month, 10) - 1

        const totalExpenses = bucket.propertyExpenses + bucket.orgExpenses

        const base: any = {
          month: key,
          label: `${SHORT_MONTHS[monthIdx]} ${year}`,
          shortLabel: SHORT_MONTHS[monthIdx] || '',
          income: Math.round(bucket.income * 100) / 100,
          expenses: Math.round(totalExpenses * 100) / 100,
          propertyExpenses: Math.round(bucket.propertyExpenses * 100) / 100,
          orgExpenses: Math.round(bucket.orgExpenses * 100) / 100,
        }

        if (detailed) {
          base.incomeBreakdown = Array.from(bucket.incomeBySource.values())
            .map(r => ({ name: r.name, amount: Math.round(r.amount * 100) / 100 }))
            .sort((a, b) => b.amount - a.amount)

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

    // Totals with new financial model
    const totalIncome = months.reduce((sum, m) => sum + m.income, 0)
    const totalPropertyExpenses = months.reduce((sum, m) => sum + m.propertyExpenses, 0)
    const totalOrgExpenses = months.reduce((sum, m) => sum + m.orgExpenses, 0)
    const totalExpenses = totalPropertyExpenses + totalOrgExpenses

    const totals = {
      income: Math.round(totalIncome * 100) / 100,
      expenses: Math.round(totalExpenses * 100) / 100,
      propertyExpenses: Math.round(totalPropertyExpenses * 100) / 100,
      orgExpenses: Math.round(totalOrgExpenses * 100) / 100,
      net: Math.round((totalIncome - totalExpenses) * 100) / 100,
      // New financial model fields
      portfolioGrossProfit: Math.round((totalIncome - totalPropertyExpenses) * 100) / 100,
      netOperatingProfit: Math.round((totalIncome - totalExpenses) * 100) / 100,
    }

    // Per-house breakdown (property gross profit per house)
    const byHouse = Array.from(houseAgg.entries())
      .map(([hId, vals]) => ({
        houseId: hId,
        houseName: houseNameMap.get(hId) || 'Unknown',
        income: Math.round(vals.income * 100) / 100,
        expenses: Math.round(vals.expenses * 100) / 100,
        net: Math.round((vals.income - vals.expenses) * 100) / 100,
        grossProfit: Math.round((vals.income - vals.expenses) * 100) / 100,
      }))
      .sort((a, b) => b.net - a.net)

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
