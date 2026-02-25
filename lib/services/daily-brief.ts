/**
 * Haven Daily Brief
 *
 * Aggregates financial data across an organisation and produces a structured
 * briefing object. A separate function renders it into a conversational,
 * text-first HTML email designed for mobile reading.
 *
 * Data sources (all queries use service-role client to bypass RLS):
 *   - transactions (income / client billing)
 *   - house_expenses (property + org costs)
 *   - houses + residents (occupancy / vacancy)
 *   - automations + automation_runs (failed runs, upcoming)
 *   - funding_contracts (expiring soon, low balance)
 *   - claims (pipeline / unclaimed amounts)
 *   - users (admin email recipients)
 */

import { Resend } from 'resend'

/* ═══════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════ */

export interface DailyBriefData {
  orgName: string
  orgId: string
  timezone: string
  /** The date the email is sent (today) — e.g. "Monday 24 February 2026" */
  todayDate: string
  /** The date the data refers to (yesterday) — e.g. "Sunday 23 February 2026" */
  reportDate: string
  baseUrl: string

  /* ── Yesterday ── */
  yesterday: {
    income: number
    propertyCosts: number
    orgCosts: number
    net: number
    transactionCount: number
    expenseCount: number
  }

  /* ── Client billing narrative ── */
  clients: {
    billedCount: number       // distinct residents billed yesterday
    housesWithBilling: number // distinct houses that had billing
    totalBilled: number       // total $ billed
  }

  /* ── Occupancy ── */
  occupancy: {
    totalHouses: number
    totalBedrooms: number
    occupiedBedrooms: number
    vacantBedrooms: number
  }

  /* ── Recurring invoices created yesterday ── */
  recurringInvoicesYesterday: {
    count: number
    total: number
    description: string // e.g. "rent" — category of the most common
  }

  /* ── P&L trend ── */
  trend: {
    last7DaysNet: number
    prior7DaysNet: number
    direction: 'up' | 'down' | 'flat'
    changeAmount: number
  }

  /* ── Property Highlights ── */
  propertyHighlights: Array<{
    propertyId: string
    propertyName: string
    income: number
    expenses: number
    net: number
  }>

  /* ── Week Ahead ── */
  outlook: {
    expectedIncome: number
    expectedPropertyCosts: number
    expectedOrgCosts: number
    projectedNet: number
    upcomingItems: Array<{
      date: string
      name: string
      category: string
      property?: string
      amount: number
    }>
  }

  /* ── Claims pipeline ── */
  claims: {
    draftAmount: number
    draftCount: number
    submittedAmount: number
    submittedCount: number
  }

  /* ── Alerts ── */
  alerts: {
    expiringContracts: Array<{
      residentName: string
      contractType: string
      endDate: string
      daysRemaining: number
    }>
    failedAutomations: Array<{
      automationName: string
      failedAt: string
      error: string
    }>
    lowBalanceContracts: Array<{
      residentName: string
      balance: number
      originalAmount: number
      percentRemaining: number
    }>
  }

  /* ── Recipient list ── */
  adminEmails: string[]
}

/* ═══════════════════════════════════════════════════════════════════════════
   Data Aggregation
   ═══════════════════════════════════════════════════════════════════════════ */

export async function aggregateDailyBrief(
  orgId: string,
  supabase: any,
  timezone: string = 'Australia/Sydney',
  lookbackDays: number = 1,
  forwardDays: number = 7,
  /** If provided, only these emails receive the brief. Otherwise all org admins. */
  recipientEmails?: string[],
): Promise<DailyBriefData> {
  const now = new Date()

  // Calculate date boundaries in the org's timezone
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
  const todayStr = formatter.format(now)

  const yesterday = new Date(todayStr + 'T00:00:00')
  yesterday.setDate(yesterday.getDate() - lookbackDays)
  const yesterdayStart = yesterday.toISOString().split('T')[0]

  const yesterdayEnd = new Date(todayStr + 'T00:00:00')
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1)
  const yesterdayEndStr = yesterdayEnd.toISOString().split('T')[0]

  // Future window
  const futureEnd = new Date(todayStr + 'T00:00:00')
  futureEnd.setDate(futureEnd.getDate() + forwardDays)
  const futureEndStr = futureEnd.toISOString().split('T')[0]

  // 7-day trend windows
  const sevenDaysAgo = new Date(todayStr + 'T00:00:00')
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

  const fourteenDaysAgo = new Date(todayStr + 'T00:00:00')
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split('T')[0]

  // ── Org name ──
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()
  const orgName = org?.name || 'Your Organisation'

  // ── Houses lookup ──
  const { data: houses } = await supabase
    .from('houses')
    .select('id, descriptor, address1, suburb, bedroom_count, status')
    .eq('organization_id', orgId)

  const houseMap = new Map<string, string>()
  let totalHouses = 0
  let totalBedrooms = 0
  for (const h of (houses || [])) {
    houseMap.set(h.id, h.descriptor || h.address1 || h.suburb || 'Unknown')
    if (h.status === 'Active') {
      totalHouses++
      totalBedrooms += (h.bedroom_count || 1)
    }
  }

  // ── Residents → house mapping + occupancy ──
  const { data: residents } = await supabase
    .from('residents')
    .select('id, house_id, status')
    .eq('organization_id', orgId)

  const residentHouseMap = new Map<string, string>()
  const occupiedHouseIds = new Set<string>()
  let occupiedBedrooms = 0
  for (const r of (residents || [])) {
    if (r.house_id) residentHouseMap.set(r.id, r.house_id)
    if (r.status === 'Active' && r.house_id) {
      occupiedHouseIds.add(r.house_id)
      occupiedBedrooms++
    }
  }
  const vacantBedrooms = Math.max(0, totalBedrooms - occupiedBedrooms)

  const residentIds = (residents || []).map((r: any) => r.id)

  // ── 1. Yesterday's income (transactions) ──
  let incomeTotal = 0
  let transactionCount = 0
  const incomeByHouse = new Map<string, number>()
  const billedResidents = new Set<string>()
  const billedHouses = new Set<string>()

  if (residentIds.length > 0) {
    const batchSize = 100
    for (let i = 0; i < residentIds.length; i += batchSize) {
      const batch = residentIds.slice(i, i + batchSize)
      const { data: txns } = await supabase
        .from('transactions')
        .select('amount, resident_id')
        .in('resident_id', batch)
        .gte('occurred_at', yesterdayStart)
        .lte('occurred_at', yesterdayEndStr + 'T23:59:59')
        .not('status', 'in', '("rejected","cancelled")')

      for (const tx of (txns || [])) {
        const amt = parseFloat(tx.amount) || 0
        incomeTotal += amt
        transactionCount++
        billedResidents.add(tx.resident_id)
        const houseId = residentHouseMap.get(tx.resident_id)
        if (houseId) {
          incomeByHouse.set(houseId, (incomeByHouse.get(houseId) || 0) + amt)
          billedHouses.add(houseId)
        }
      }
    }
  }

  // ── 2. Yesterday's expenses ──
  const { data: expensesData } = await supabase
    .from('house_expenses')
    .select('amount, house_id, scope, category, source')
    .eq('organization_id', orgId)
    .gte('occurred_at', yesterdayStart)
    .lte('occurred_at', yesterdayEndStr + 'T23:59:59')
    .not('status', 'eq', 'cancelled')

  let propertyCosts = 0
  let orgCosts = 0
  let expenseCount = 0
  const expenseByHouse = new Map<string, number>()
  let recurringExpenseCount = 0
  let recurringExpenseTotal = 0
  const recurringCategoryCounts = new Map<string, number>()

  for (const e of (expensesData || [])) {
    const amt = parseFloat(e.amount) || 0
    expenseCount++
    if (e.scope === 'organisation') {
      orgCosts += amt
    } else {
      propertyCosts += amt
      if (e.house_id) {
        expenseByHouse.set(e.house_id, (expenseByHouse.get(e.house_id) || 0) + amt)
      }
    }
    // Track automation-generated expenses
    if (e.source === 'automation') {
      recurringExpenseCount++
      recurringExpenseTotal += amt
      const cat = e.category || 'other'
      recurringCategoryCounts.set(cat, (recurringCategoryCounts.get(cat) || 0) + 1)
    }
  }

  // Find most common recurring category
  let topRecurringCategory = 'expense'
  let topCatCount = 0
  recurringCategoryCounts.forEach((count, cat) => {
    if (count > topCatCount) {
      topCatCount = count
      topRecurringCategory = cat
    }
  })

  const net = incomeTotal - propertyCosts - orgCosts

  // ── Property highlights ──
  const allHouseIds = new Set<string>()
  incomeByHouse.forEach((_v, k) => allHouseIds.add(k))
  expenseByHouse.forEach((_v, k) => allHouseIds.add(k))
  const propertyData: DailyBriefData['propertyHighlights'] = []
  allHouseIds.forEach((hid) => {
    const inc = incomeByHouse.get(hid) || 0
    const exp = expenseByHouse.get(hid) || 0
    propertyData.push({
      propertyId: hid,
      propertyName: houseMap.get(hid) || 'Unknown',
      income: inc,
      expenses: exp,
      net: inc - exp,
    })
  })
  const negativeNet = propertyData.filter((p) => p.net < 0).sort((a, b) => a.net - b.net)
  const positiveNet = propertyData.filter((p) => p.net >= 0).sort((a, b) => b.net - a.net).slice(0, 3)
  const propertyHighlights = [...negativeNet, ...positiveNet]

  // ── 7-day P&L trend ──
  // Last 7 days income
  let last7Income = 0
  let prior7Income = 0
  if (residentIds.length > 0) {
    const batchSize = 100
    for (let i = 0; i < residentIds.length; i += batchSize) {
      const batch = residentIds.slice(i, i + batchSize)
      // Last 7 days
      const { data: txns7 } = await supabase
        .from('transactions')
        .select('amount')
        .in('resident_id', batch)
        .gte('occurred_at', sevenDaysAgoStr)
        .lte('occurred_at', yesterdayEndStr + 'T23:59:59')
        .not('status', 'in', '("rejected","cancelled")')
      for (const tx of (txns7 || [])) { last7Income += parseFloat(tx.amount) || 0 }

      // Prior 7 days
      const { data: txns14 } = await supabase
        .from('transactions')
        .select('amount')
        .in('resident_id', batch)
        .gte('occurred_at', fourteenDaysAgoStr)
        .lt('occurred_at', sevenDaysAgoStr)
        .not('status', 'in', '("rejected","cancelled")')
      for (const tx of (txns14 || [])) { prior7Income += parseFloat(tx.amount) || 0 }
    }
  }

  // Last 7 days expenses
  const { data: expenses7 } = await supabase
    .from('house_expenses')
    .select('amount')
    .eq('organization_id', orgId)
    .gte('occurred_at', sevenDaysAgoStr)
    .lte('occurred_at', yesterdayEndStr + 'T23:59:59')
    .not('status', 'eq', 'cancelled')
  let last7Expenses = 0
  for (const e of (expenses7 || [])) { last7Expenses += parseFloat(e.amount) || 0 }

  const { data: expenses14 } = await supabase
    .from('house_expenses')
    .select('amount')
    .eq('organization_id', orgId)
    .gte('occurred_at', fourteenDaysAgoStr)
    .lt('occurred_at', sevenDaysAgoStr)
    .not('status', 'eq', 'cancelled')
  let prior7Expenses = 0
  for (const e of (expenses14 || [])) { prior7Expenses += parseFloat(e.amount) || 0 }

  const last7DaysNet = last7Income - last7Expenses
  const prior7DaysNet = prior7Income - prior7Expenses
  const changeAmount = last7DaysNet - prior7DaysNet
  const trendDirection: 'up' | 'down' | 'flat' = changeAmount > 50 ? 'up' : changeAmount < -50 ? 'down' : 'flat'

  // ── 3. Outlook — upcoming scheduled automations ──
  const { data: upcomingAutomations } = await supabase
    .from('automations')
    .select('id, name, type, parameters, schedule, next_run_at')
    .eq('organization_id', orgId)
    .eq('is_enabled', true)
    .gte('next_run_at', todayStr)
    .lte('next_run_at', futureEndStr + 'T23:59:59')
    .neq('type', 'daily_digest')
    .order('next_run_at', { ascending: true })
    .limit(20)

  let expectedIncome = 0
  let expectedPropertyCosts = 0
  let expectedOrgCosts = 0
  const upcomingItems: DailyBriefData['outlook']['upcomingItems'] = []

  for (const auto of (upcomingAutomations || [])) {
    const params = auto.parameters || {}
    const nextDate = auto.next_run_at ? new Date(auto.next_run_at).toLocaleDateString('en-AU', { timeZone: timezone, day: 'numeric', month: 'short' }) : '—'

    if (auto.type === 'recurring_transaction') {
      let amount = 0
      let category = 'Recurring'
      let propertyName: string | undefined

      if (params.templateExpenseId) {
        const { data: tpl } = await supabase
          .from('house_expenses')
          .select('amount, category, scope, house_id')
          .eq('id', params.templateExpenseId)
          .single()
        if (tpl) {
          amount = parseFloat(tpl.amount) || 0
          category = tpl.category || 'Expense'
          if (tpl.scope === 'organisation') {
            expectedOrgCosts += amount
          } else {
            expectedPropertyCosts += amount
            propertyName = tpl.house_id ? houseMap.get(tpl.house_id) : undefined
          }
        }
      } else if (params.templateTransactionId) {
        const { data: tpl } = await supabase
          .from('transactions')
          .select('amount, description')
          .eq('id', params.templateTransactionId)
          .single()
        if (tpl) {
          amount = parseFloat(tpl.amount) || 0
          category = 'Income'
          expectedIncome += amount
        }
      }

      upcomingItems.push({ date: nextDate, name: auto.name, category, property: propertyName, amount })
    } else if (auto.type === 'contract_billing_run') {
      const { data: activeContracts } = await supabase
        .from('funding_contracts')
        .select('daily_support_item_cost')
        .eq('organization_id', orgId)
        .eq('auto_billing_enabled', true)
        .eq('contract_status', 'Active')

      let estIncome = 0
      for (const c of (activeContracts || [])) {
        estIncome += parseFloat(c.daily_support_item_cost) || 0
      }
      expectedIncome += estIncome
      upcomingItems.push({ date: nextDate, name: auto.name, category: 'Contract Billing', amount: estIncome })
    }
  }

  const projectedNet = expectedIncome - expectedPropertyCosts - expectedOrgCosts

  // ── Claims pipeline ──
  const { data: draftClaims } = await supabase
    .from('claims')
    .select('total_amount')
    .eq('status', 'draft')
  let draftAmount = 0
  let draftCount = 0
  for (const c of (draftClaims || [])) {
    draftAmount += parseFloat(c.total_amount) || 0
    draftCount++
  }

  const { data: submittedClaims } = await supabase
    .from('claims')
    .select('total_amount')
    .in('status', ['submitted', 'in_progress', 'processed', 'auto_processed'])
  let submittedAmount = 0
  let submittedCount = 0
  for (const c of (submittedClaims || [])) {
    submittedAmount += parseFloat(c.total_amount) || 0
    submittedCount++
  }

  // ── 4. Alerts ──

  // 4a. Expiring contracts (within 30 days)
  const thirtyDaysOut = new Date(todayStr + 'T00:00:00')
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)
  const thirtyDaysStr = thirtyDaysOut.toISOString().split('T')[0]

  const { data: expiringContracts } = await supabase
    .from('funding_contracts')
    .select('id, type, end_date, resident_id, residents!inner(first_name, last_name)')
    .eq('organization_id', orgId)
    .eq('contract_status', 'Active')
    .not('end_date', 'is', null)
    .lte('end_date', thirtyDaysStr)
    .gte('end_date', todayStr)
    .order('end_date', { ascending: true })
    .limit(10)

  const expiringAlerts: DailyBriefData['alerts']['expiringContracts'] = []
  for (const c of (expiringContracts || [])) {
    const resident = (c as any).residents
    const endDate = new Date(c.end_date)
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    expiringAlerts.push({
      residentName: resident ? `${resident.first_name || ''} ${resident.last_name || ''}`.trim() : 'Unknown',
      contractType: c.type || 'Funding',
      endDate: endDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
      daysRemaining,
    })
  }

  // 4b. Failed automations (last 24h)
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const { data: failedRuns } = await supabase
    .from('automation_runs')
    .select('id, automation_id, finished_at, error, automations!inner(name)')
    .eq('organization_id', orgId)
    .eq('status', 'failed')
    .gte('started_at', twentyFourHoursAgo)
    .order('started_at', { ascending: false })
    .limit(10)

  const failedAlerts: DailyBriefData['alerts']['failedAutomations'] = []
  for (const r of (failedRuns || [])) {
    failedAlerts.push({
      automationName: (r as any).automations?.name || 'Unknown',
      failedAt: r.finished_at ? new Date(r.finished_at).toLocaleTimeString('en-AU', { timeZone: timezone }) : '—',
      error: typeof r.error === 'string' ? r.error : (r.error as any)?.message || 'Unknown error',
    })
  }

  // 4c. Low balance contracts (< 20% remaining)
  const { data: lowBalanceContracts } = await supabase
    .from('funding_contracts')
    .select('id, original_amount, current_balance, resident_id, residents!inner(first_name, last_name)')
    .eq('organization_id', orgId)
    .eq('contract_status', 'Active')
    .gt('original_amount', 0)
    .order('current_balance', { ascending: true })
    .limit(50)

  const lowBalanceAlerts: DailyBriefData['alerts']['lowBalanceContracts'] = []
  for (const c of (lowBalanceContracts || [])) {
    const pct = (parseFloat(c.current_balance) / parseFloat(c.original_amount)) * 100
    if (pct < 20 && pct >= 0) {
      const resident = (c as any).residents
      lowBalanceAlerts.push({
        residentName: resident ? `${resident.first_name || ''} ${resident.last_name || ''}`.trim() : 'Unknown',
        balance: parseFloat(c.current_balance) || 0,
        originalAmount: parseFloat(c.original_amount) || 0,
        percentRemaining: Math.round(pct),
      })
    }
  }
  lowBalanceAlerts.splice(10)

  // ── Recipients ──
  // If explicit recipients were provided, use those. Otherwise fall back to all org admins.
  let adminEmails: string[] = []
  if (recipientEmails && recipientEmails.length > 0) {
    adminEmails = recipientEmails.filter(Boolean)
  } else {
    const { data: admins } = await supabase
      .from('users')
      .select('email')
      .eq('organization_id', orgId)
      .eq('role', 'admin')
      .eq('status', 'active')
    adminEmails = (admins || []).map((u: any) => u.email).filter(Boolean)
  }

  // ── Base URL ──
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  // ── Dates ──
  const todayDate = now.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: timezone,
  })

  const reportDate = yesterdayEnd.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: timezone,
  })

  return {
    orgName,
    orgId,
    timezone,
    todayDate,
    reportDate,
    baseUrl,
    yesterday: { income: incomeTotal, propertyCosts, orgCosts, net, transactionCount, expenseCount },
    clients: {
      billedCount: billedResidents.size,
      housesWithBilling: billedHouses.size,
      totalBilled: incomeTotal,
    },
    occupancy: {
      totalHouses,
      totalBedrooms,
      occupiedBedrooms,
      vacantBedrooms,
    },
    recurringInvoicesYesterday: {
      count: recurringExpenseCount,
      total: recurringExpenseTotal,
      description: topRecurringCategory,
    },
    trend: {
      last7DaysNet,
      prior7DaysNet,
      direction: trendDirection,
      changeAmount,
    },
    propertyHighlights,
    outlook: {
      expectedIncome,
      expectedPropertyCosts,
      expectedOrgCosts,
      projectedNet,
      upcomingItems: upcomingItems.slice(0, 5),
    },
    claims: { draftAmount, draftCount, submittedAmount, submittedCount },
    alerts: {
      expiringContracts: expiringAlerts,
      failedAutomations: failedAlerts,
      lowBalanceContracts: lowBalanceAlerts,
    },
    adminEmails,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

function fmt(n: number): string {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtWhole(n: number): string {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtShort(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return '$' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm'
  }
  if (Math.abs(n) >= 1000) {
    return '$' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  }
  return '$' + fmtWhole(n)
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function green(text: string): string {
  return `<span style="color:#059669;font-weight:600;">${text}</span>`
}

function red(text: string): string {
  return `<span style="color:#dc2626;font-weight:600;">${text}</span>`
}

function muted(text: string): string {
  return `<span style="color:#6b7280;">${text}</span>`
}

function bold(text: string): string {
  return `<strong>${text}</strong>`
}

function link(href: string, text: string): string {
  return `<a href="${href}" style="color:#4f46e5;text-decoration:none;border-bottom:1px solid #c7d2fe;">${text}</a>`
}

function moneyColor(n: number): string {
  if (n > 0) return green(`$${fmt(n)}`)
  if (n < 0) return red(`-$${fmt(Math.abs(n))}`)
  return muted('$0.00')
}

function pluralise(n: number, singular: string, plural?: string): string {
  return n === 1 ? singular : (plural || singular + 's')
}

/* ═══════════════════════════════════════════════════════════════════════════
   HTML Email Template — Executive operational briefing
   ═══════════════════════════════════════════════════════════════════════════
   Reads like a CFO-style morning memo, not a dashboard or marketing email.
   Structure:
     1. Header
     2. Executive Summary (3–5 bullet snapshot)
     3. Yesterday (narrative + number strip)
     4. 7-Day Context
     5. Portfolio Context
     6. Your Week Ahead (grouped: Funding · Costs · Contract Risk · Projections)
     7. Risk & Alerts
   ═══════════════════════════════════════════════════════════════════════════ */

export function renderDailyBriefEmail(data: DailyBriefData): string {
  const {
    yesterday: y,
    clients: cl,
    occupancy: occ,
    recurringInvoicesYesterday: rec,
    trend: tr,
    outlook: o,
    claims: cm,
    alerts: a,
    propertyHighlights: ph,
  } = data

  /* ─── 1. Executive Summary bullets ─── */
  const execBullets: string[] = []

  // Yesterday's outcome
  if (y.net > 0) {
    execBullets.push(`Yesterday closed ${green('+$' + fmt(y.net))}.`)
  } else if (y.net < 0) {
    execBullets.push(`Yesterday closed ${red('-$' + fmt(Math.abs(y.net)))}.`)
  } else if (y.transactionCount === 0 && y.expenseCount === 0) {
    execBullets.push('No financial activity recorded yesterday.')
  } else {
    execBullets.push('Yesterday closed neutral.')
  }

  // 7-day trend
  const last7Formatted = tr.last7DaysNet >= 0 ? green('+$' + fmt(tr.last7DaysNet)) : red('-$' + fmt(Math.abs(tr.last7DaysNet)))
  const vsWord = tr.direction === 'up' ? 'improving' : tr.direction === 'down' ? 'declining' : 'steady'
  execBullets.push(`The business is ${last7Formatted} over the past 7 days, ${vsWord} vs the prior week.`)

  // Occupancy
  if (occ.totalBedrooms > 0) {
    const pct = Math.round((occ.occupiedBedrooms / occ.totalBedrooms) * 100)
    if (occ.vacantBedrooms > 0) {
      execBullets.push(`Portfolio occupancy is ${bold(pct + '%')} (${occ.occupiedBedrooms} of ${occ.totalBedrooms} beds filled).`)
    } else {
      execBullets.push(`Portfolio at ${green('full capacity')} — all ${occ.totalBedrooms} beds occupied.`)
    }
  }

  // Cash pressure
  if (o.projectedNet < 0) {
    execBullets.push('Cash outflow expected this week due to scheduled rent and recurring costs.')
  } else if (o.projectedNet > 0) {
    execBullets.push(`Net inflow of ${green('$' + fmt(o.projectedNet))} projected this week.`)
  }

  // Risks
  const totalRisks = a.expiringContracts.length + a.failedAutomations.length + a.lowBalanceContracts.length
  if (totalRisks === 0) {
    execBullets.push('No contract or automation risks detected.')
  } else {
    const parts: string[] = []
    if (a.expiringContracts.length > 0) parts.push(`${a.expiringContracts.length} expiring ${pluralise(a.expiringContracts.length, 'contract')}`)
    if (a.lowBalanceContracts.length > 0) parts.push(`${a.lowBalanceContracts.length} low-balance ${pluralise(a.lowBalanceContracts.length, 'client')}`)
    if (a.failedAutomations.length > 0) parts.push(`${a.failedAutomations.length} failed ${pluralise(a.failedAutomations.length, 'automation')}`)
    execBullets.push(`${bold(String(totalRisks))} ${pluralise(totalRisks, 'item')} flagged: ${parts.join(', ')}. See below.`)
  }

  /* ─── 2. Yesterday section ─── */
  let billingNarrative: string
  if (cl.billedCount > 0) {
    billingNarrative = `${bold(String(cl.billedCount))} ${pluralise(cl.billedCount, 'client')} in ${bold(String(cl.housesWithBilling))} ${pluralise(cl.housesWithBilling, 'house')} were billed a total of ${green('$' + fmt(cl.totalBilled))}. This is yet to be claimed.`
  } else {
    billingNarrative = 'No billing activity recorded yesterday.'
  }

  let recurringNarrative = ''
  if (rec.count > 0) {
    recurringNarrative = `${bold('$' + fmt(rec.total))} of invoices were created from ${bold(String(rec.count))} recurring ${esc(rec.description)} ${pluralise(rec.count, 'automation')}.`
  }

  const txContextLine = y.transactionCount > 0 || y.expenseCount > 0
    ? `${y.transactionCount} ${pluralise(y.transactionCount, 'transaction')} across ${y.expenseCount} ${pluralise(y.expenseCount, 'expense')}.`
    : '0 transactions across 0 expenses.'

  /* ─── 3. 7-Day Context line ─── */
  const last7Str = tr.last7DaysNet >= 0 ? green('$' + fmt(tr.last7DaysNet)) : red('-$' + fmt(Math.abs(tr.last7DaysNet)))
  const trendVs = tr.direction === 'up' ? 'improving' : tr.direction === 'down' ? 'declining' : 'steady'
  const sevenDayLine = `Over the last 7 days the net position is ${last7Str}, ${trendVs} vs the prior week.`

  /* ─── 4. Portfolio Context ─── */
  let portfolioBlock = ''
  if (occ.totalHouses > 0) {
    const pct = Math.round((occ.occupiedBedrooms / occ.totalBedrooms) * 100)
    if (occ.vacantBedrooms > 0) {
      portfolioBlock = `Of ${bold(String(occ.totalHouses))} ${pluralise(occ.totalHouses, 'house')} online, ${bold(String(occ.vacantBedrooms))} ${pluralise(occ.vacantBedrooms, 'room')} ${occ.vacantBedrooms === 1 ? 'is' : 'are'} vacant (${occ.occupiedBedrooms} of ${occ.totalBedrooms} beds filled). Portfolio occupancy: ${bold(pct + '%')}.`
    } else {
      portfolioBlock = `All ${bold(String(occ.totalBedrooms))} rooms across ${bold(String(occ.totalHouses))} ${pluralise(occ.totalHouses, 'house')} are occupied. ${green('Full capacity.')}`
    }
  }

  /* ─── 5. Property highlights ─── */
  let propertyLine = ''
  if (ph.length > 0) {
    const snippets = ph.slice(0, 4).map(p => {
      const netStr = p.net >= 0 ? green('+$' + fmt(p.net)) : red('-$' + fmt(Math.abs(p.net)))
      return `${bold(esc(p.propertyName))} ${netStr}`
    })
    propertyLine = snippets.join(' &nbsp;·&nbsp; ')
  }

  /* ─── 6. Week Ahead — grouped ─── */

  // Funding Pipeline
  const fundingLines: string[] = []
  if (cm.draftCount > 0) {
    fundingLines.push(`${bold(fmtShort(cm.draftAmount))} across ${bold(String(cm.draftCount))} ${pluralise(cm.draftCount, 'claim')} ${pluralise(cm.draftCount, 'needs', 'need')} ${link(data.baseUrl + '/claims', 'submission')}.`)
  }
  if (cm.submittedCount > 0) {
    fundingLines.push(`${bold(fmtShort(cm.submittedAmount))} across ${bold(String(cm.submittedCount))} ${pluralise(cm.submittedCount, 'claim')} awaiting payment.`)
  }

  // Upcoming Costs
  const costLines: string[] = []
  for (const item of o.upcomingItems.slice(0, 5)) {
    const propStr = item.property ? ` (${esc(item.property)})` : ''
    const amtStr = item.amount > 0 ? `: $${fmt(item.amount)}` : ''
    costLines.push(`${bold(esc(item.date))} — ${esc(item.name)}${propStr}${amtStr}`)
  }

  // Contract Risk
  const contractRiskLines: string[] = []
  for (const exp of a.expiringContracts.slice(0, 5)) {
    contractRiskLines.push(`${bold(esc(exp.residentName))} contract expires ${bold(esc(exp.endDate))} (${exp.daysRemaining} ${pluralise(exp.daysRemaining, 'day')}).`)
  }
  for (const lb of a.lowBalanceContracts.slice(0, 5)) {
    contractRiskLines.push(`${bold(esc(lb.residentName))} low balance: ${red('$' + fmt(lb.balance) + ' remaining')}.`)
  }

  // Projected net context
  let projectionContext = ''
  if (o.projectedNet < 0) {
    projectionContext = 'Cash outflow expected this week due to scheduled rent and recurring costs.'
  }

  /* ─── 7. Risk & Alerts ─── */
  const riskLines: string[] = []

  if (a.failedAutomations.length > 0) {
    for (const f of a.failedAutomations.slice(0, 5)) {
      riskLines.push(`${red('⚠')} ${bold(esc(f.automationName))} failed at ${esc(f.failedAt)} — ${muted(esc(f.error))}`)
    }
  }

  const negProps = ph.filter(p => p.net < 0)
  if (negProps.length > 0) {
    for (const p of negProps.slice(0, 3)) {
      riskLines.push(`${bold(esc(p.propertyName))} ran at a loss yesterday: income $${fmt(p.income)}, costs $${fmt(p.expenses)}, net ${red('-$' + fmt(Math.abs(p.net)))}.`)
    }
  }

  const hasRisks = riskLines.length > 0

  /* ═══════════════════════════════════════════════════════════
     Render HTML
     ═══════════════════════════════════════════════════════════ */
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Daily Brief — ${esc(data.todayDate)}</title>
  <!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
  <style>
    body, html { margin: 0; padding: 0; width: 100%; }
    body {
      font-family: Georgia, 'Times New Roman', Times, serif;
      background: #f9fafb;
      color: #1f2937;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      line-height: 1.7;
    }
    img { border: 0; display: block; }
    a { color: #4f46e5; }

    .outer { width: 100%; background: #f9fafb; padding: 24px 0; }
    .inner {
      max-width: 560px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
    }

    /* Header */
    .header-bar {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
      padding: 28px 32px 22px;
    }
    .header-bar h1 {
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      letter-spacing: -0.3px;
    }
    .header-bar .org-date {
      margin: 0 0 6px;
      font-size: 13px;
      color: rgba(255,255,255,0.7);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .header-bar .positioning {
      margin: 0;
      font-size: 12px;
      color: rgba(255,255,255,0.5);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-style: italic;
    }

    .body-content { padding: 28px 32px 32px; }

    /* Intro */
    .intro {
      font-size: 14.5px;
      color: #6b7280;
      line-height: 1.6;
      margin: 0 0 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid #f3f4f6;
    }

    /* Section headers */
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #9ca3af;
      margin: 28px 0 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .section-title:first-child { margin-top: 0; }

    /* Sub-section headers */
    .sub-title {
      font-size: 12px;
      font-weight: 700;
      color: #6b7280;
      margin: 18px 0 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Paragraphs */
    p { font-size: 15px; line-height: 1.7; margin: 0 0 12px; color: #1f2937; }
    .context { font-size: 14px; color: #6b7280; margin: 4px 0 12px; line-height: 1.6; }

    /* Executive summary bullets */
    .exec-summary {
      background: #fafbfc;
      border-left: 3px solid #312e81;
      padding: 14px 18px;
      margin: 0 0 24px;
      border-radius: 0 6px 6px 0;
    }
    .exec-summary ul { margin: 0; padding-left: 16px; }
    .exec-summary li {
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 4px;
      color: #374151;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Number strip */
    .nums {
      background: #f8fafc;
      border-radius: 6px;
      padding: 14px 18px;
      margin: 16px 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .nums table { width: 100%; border-collapse: collapse; }
    .nums td { padding: 3px 0; font-size: 13px; color: #6b7280; }
    .nums .val { text-align: right; font-weight: 600; font-size: 14px; }
    .nums .net td { padding-top: 7px; border-top: 1px solid #e5e7eb; }
    .nums .net .lbl { font-weight: 700; color: #1f2937; font-size: 14px; }

    /* Bullet list */
    ul { margin: 0 0 12px; padding-left: 18px; }
    li { font-size: 14.5px; line-height: 1.65; margin-bottom: 6px; color: #1f2937; }

    /* Property line */
    .prop-line { font-size: 13px; color: #6b7280; line-height: 1.5; margin: 2px 0 14px; }

    /* Divider */
    .sep { height: 1px; background: #f3f4f6; margin: 24px 0; }

    /* CTA */
    .cta { text-align: center; margin: 24px 0 8px; }
    .cta a {
      display: inline-block;
      background: #1e1b4b;
      color: #ffffff;
      padding: 11px 26px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Footer */
    .footer { text-align: center; padding: 16px 32px 24px; }
    .footer p { margin: 0; font-size: 11px; color: #9ca3af; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; }
    .footer a { color: #6366f1; text-decoration: none; }

    /* Quiet / no-data state */
    .quiet { font-size: 14px; color: #9ca3af; margin: 0 0 12px; }

    /* Mobile */
    @media (max-width: 600px) {
      .inner { border-radius: 0; }
      .header-bar { padding: 22px 20px 18px; }
      .body-content { padding: 22px 20px 28px; }
      .header-bar h1 { font-size: 20px; }
      p { font-size: 14.5px; }
      li { font-size: 14px; }
      .nums { padding: 12px 14px; }
      .exec-summary { padding: 12px 14px; }
      .footer { padding: 14px 20px 20px; }
    }
  </style>
</head>
<body>
  <div class="outer">
    <div class="inner">

      <!-- ─── 1. HEADER ─── -->
      <div class="header-bar">
        <h1>☀️ Daily Brief</h1>
        <p class="org-date">${esc(data.todayDate)}</p>
        <p class="positioning">Your morning operational snapshot across funding, houses and risk.</p>
      </div>

      <div class="body-content">

        <!-- ─── Intro ─── -->
        <p class="intro">
          Please find an update on what happened yesterday across the business from a client, house and organisational funding perspective.
        </p>

        <!-- ─── 2. EXECUTIVE SUMMARY ─── -->
        <div class="exec-summary">
          <ul>
            ${execBullets.map(b => `<li>${b}</li>`).join('\n            ')}
          </ul>
        </div>

        <!-- ─── 3. YESTERDAY ─── -->
        <div class="section-title">Yesterday</div>

        <p>${billingNarrative}</p>

        ${recurringNarrative ? `<p>${recurringNarrative}</p>` : ''}

        <div class="nums">
          <table>
            <tr>
              <td>Client Income</td>
              <td class="val" style="color:#059669;">$${fmt(y.income)}</td>
            </tr>
            <tr>
              <td>Property Costs</td>
              <td class="val" style="color:${y.propertyCosts > 0 ? '#dc2626' : '#6b7280'};">$${fmt(y.propertyCosts)}</td>
            </tr>
            <tr>
              <td>Organisation Costs</td>
              <td class="val" style="color:${y.orgCosts > 0 ? '#dc2626' : '#6b7280'};">$${fmt(y.orgCosts)}</td>
            </tr>
            <tr class="net">
              <td class="lbl">Net Result</td>
              <td class="val" style="color:${y.net >= 0 ? '#059669' : '#dc2626'};">${y.net >= 0 ? '' : '-'}$${fmt(Math.abs(y.net))}</td>
            </tr>
          </table>
        </div>

        ${propertyLine ? `<p class="prop-line">${propertyLine}</p>` : ''}

        <p class="context">${txContextLine}</p>

        <!-- ─── 4. 7-DAY CONTEXT ─── -->
        <p>${sevenDayLine}</p>

        <!-- ─── 5. PORTFOLIO CONTEXT ─── -->
        ${portfolioBlock ? `<p>${portfolioBlock}</p>` : ''}

        <!-- ─── 6. YOUR WEEK AHEAD ─── -->
        <div class="sep"></div>
        <div class="section-title">Your Week Ahead</div>

        ${fundingLines.length > 0 ? `
        <div class="sub-title">Funding Pipeline</div>
        <ul>
          ${fundingLines.map(l => `<li>${l}</li>`).join('\n          ')}
        </ul>
        ` : ''}

        ${costLines.length > 0 ? `
        <div class="sub-title">Upcoming Costs</div>
        <ul>
          ${costLines.map(l => `<li>${l}</li>`).join('\n          ')}
        </ul>
        ` : ''}

        ${contractRiskLines.length > 0 ? `
        <div class="sub-title">Contract Risk</div>
        <ul>
          ${contractRiskLines.map(l => `<li>${l}</li>`).join('\n          ')}
        </ul>
        ` : ''}

        ${fundingLines.length === 0 && costLines.length === 0 && contractRiskLines.length === 0 ? `
        <p class="quiet">Nothing scheduled for the coming week.</p>
        ` : ''}

        ${(o.expectedIncome > 0 || o.expectedPropertyCosts > 0 || o.expectedOrgCosts > 0) ? `
        <div class="nums">
          <table>
            <tr>
              <td>Expected Income (7d)</td>
              <td class="val" style="color:#059669;">$${fmt(o.expectedIncome)}</td>
            </tr>
            <tr>
              <td>Expected Costs (7d)</td>
              <td class="val" style="color:${(o.expectedPropertyCosts + o.expectedOrgCosts) > 0 ? '#dc2626' : '#6b7280'};">$${fmt(o.expectedPropertyCosts + o.expectedOrgCosts)}</td>
            </tr>
            <tr class="net">
              <td class="lbl">Projected Net</td>
              <td class="val" style="color:${o.projectedNet >= 0 ? '#059669' : '#dc2626'};">${o.projectedNet >= 0 ? '' : '-'}$${fmt(Math.abs(o.projectedNet))}</td>
            </tr>
          </table>
        </div>
        ${projectionContext ? `<p class="context">${projectionContext}</p>` : ''}
        ` : ''}

        <!-- ─── 7. RISK & ALERTS ─── -->
        <div class="sep"></div>
        <div class="section-title">Risk &amp; Alerts</div>

        ${hasRisks ? `
        <ul>
          ${riskLines.map(l => `<li>${l}</li>`).join('\n          ')}
        </ul>
        ` : `
        <p class="quiet">No financial or contract risks identified today. All automations operating normally.</p>
        `}

        <div class="sep"></div>

        <div class="cta">
          <a href="${data.baseUrl}/dashboard">Open Haven →</a>
        </div>

      </div>

      <div class="footer">
        <p>
          Daily Brief<br>
          <a href="${data.baseUrl}/automations">Automations</a> · <a href="${data.baseUrl}/transactions">Transactions</a> · <a href="${data.baseUrl}/houses">Houses</a> · <a href="${data.baseUrl}/claims">Claims</a>
        </p>
      </div>

    </div>
  </div>
</body>
</html>`
}

/* ═══════════════════════════════════════════════════════════════════════════
   Send Email
   ═══════════════════════════════════════════════════════════════════════════ */

export async function sendDailyBriefEmail(
  data: DailyBriefData,
): Promise<{ success: boolean; recipientCount: number; error?: string }> {
  if (data.adminEmails.length === 0) {
    return { success: true, recipientCount: 0, error: 'No admin users to send to' }
  }

  const html = renderDailyBriefEmail(data)
  const subject = `☀️ Daily Brief — ${data.todayDate}`

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[DAILY BRIEF] RESEND_API_KEY not configured — email not sent')
    return { success: false, recipientCount: 0, error: 'RESEND_API_KEY not configured' }
  }

  const fromEmail = process.env.FROM_EMAIL || 'Haven <onboarding@resend.dev>'

  try {
    const resend = new Resend(apiKey)
    const { error: sendErr } = await resend.emails.send({
      from: fromEmail,
      to: data.adminEmails,
      subject,
      html,
    })

    if (sendErr) {
      console.error('[DAILY BRIEF] Resend error:', sendErr)
      return { success: false, recipientCount: 0, error: sendErr.message }
    }

    console.log(`[DAILY BRIEF] Sent to ${data.adminEmails.length} admin(s) for ${data.orgName}`)
    return { success: true, recipientCount: data.adminEmails.length }
  } catch (err: any) {
    console.error('[DAILY BRIEF] Send error:', err)
    return { success: false, recipientCount: 0, error: err.message }
  }
}
