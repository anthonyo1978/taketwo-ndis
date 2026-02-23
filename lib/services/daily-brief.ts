/**
 * Haven Daily Brief
 *
 * Aggregates financial data across an organisation and produces a structured
 * briefing object. A separate function renders it into an HTML email.
 *
 * Data sources (all queries use service-role client to bypass RLS):
 *   - transactions (income)
 *   - house_expenses (property + org costs)
 *   - houses (property names)
 *   - automations + automation_runs (failed runs, upcoming)
 *   - funding_contracts (expiring soon, low balance)
 *   - users (admin email recipients)
 */

import { Resend } from 'resend'
import type { Automation } from 'types/automation'
import { createNotification } from './notification-service'

/* ═══════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════ */

export interface DailyBriefData {
  orgName: string
  orgId: string
  timezone: string
  reportDate: string // human-readable e.g. "Monday 24 Feb 2026"
  baseUrl: string

  /* Section 1 — Executive Snapshot (Yesterday) */
  yesterday: {
    income: number
    propertyCosts: number
    orgCosts: number
    net: number
    transactionCount: number
    expenseCount: number
  }

  /* Section 2 — Property Highlights */
  propertyHighlights: Array<{
    propertyId: string
    propertyName: string
    income: number
    expenses: number
    net: number
  }>

  /* Section 3 — Next 7-Day Outlook */
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

  /* Section 4 — Alerts */
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

  /* Recipient list */
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
): Promise<DailyBriefData> {
  const now = new Date()

  // Calculate yesterday boundaries in the org's timezone
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
    .select('id, descriptor, address1, suburb')
    .eq('organization_id', orgId)

  const houseMap = new Map<string, string>()
  for (const h of (houses || [])) {
    houseMap.set(h.id, h.descriptor || h.address1 || h.suburb || 'Unknown')
  }

  // ── Residents → house mapping ──
  const { data: residents } = await supabase
    .from('residents')
    .select('id, house_id')
    .eq('organization_id', orgId)

  const residentHouseMap = new Map<string, string>()
  for (const r of (residents || [])) {
    if (r.house_id) residentHouseMap.set(r.id, r.house_id)
  }
  const residentIds = (residents || []).map((r: any) => r.id)

  // ── 1. Yesterday's income (transactions) ──
  let incomeTotal = 0
  let transactionCount = 0
  const incomeByHouse = new Map<string, number>()

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
        const houseId = residentHouseMap.get(tx.resident_id)
        if (houseId) {
          incomeByHouse.set(houseId, (incomeByHouse.get(houseId) || 0) + amt)
        }
      }
    }
  }

  // ── 2. Yesterday's expenses ──
  const { data: expenses } = await supabase
    .from('house_expenses')
    .select('amount, house_id, scope')
    .eq('organization_id', orgId)
    .gte('occurred_at', yesterdayStart)
    .lte('occurred_at', yesterdayEndStr + 'T23:59:59')
    .not('status', 'eq', 'cancelled')

  let propertyCosts = 0
  let orgCosts = 0
  let expenseCount = 0
  const expenseByHouse = new Map<string, number>()

  for (const e of (expenses || [])) {
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
  }

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
  // Show: negative-net properties first, then top 3 positive
  const negativeNet = propertyData.filter((p) => p.net < 0).sort((a, b) => a.net - b.net)
  const positiveNet = propertyData.filter((p) => p.net >= 0).sort((a, b) => b.net - a.net).slice(0, 3)
  const propertyHighlights = [...negativeNet, ...positiveNet]

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
      // Try to look up the template to get amount
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

      upcomingItems.push({
        date: nextDate,
        name: auto.name,
        category,
        property: propertyName,
        amount,
      })
    } else if (auto.type === 'contract_billing_run') {
      // Estimate from active contracts
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

      upcomingItems.push({
        date: nextDate,
        name: auto.name,
        category: 'Contract Billing',
        amount: estIncome,
      })
    }
  }

  const projectedNet = expectedIncome - expectedPropertyCosts - expectedOrgCosts

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
  // Cap at 10
  lowBalanceAlerts.splice(10)

  // ── Admin emails ──
  const { data: admins } = await supabase
    .from('users')
    .select('email')
    .eq('organization_id', orgId)
    .eq('role', 'admin')
    .eq('status', 'active')

  const adminEmails = (admins || []).map((u: any) => u.email).filter(Boolean)

  // ── Base URL ──
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  // ── Report date ──
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
    reportDate,
    baseUrl,
    yesterday: {
      income: incomeTotal,
      propertyCosts,
      orgCosts,
      net,
      transactionCount,
      expenseCount,
    },
    propertyHighlights,
    outlook: {
      expectedIncome,
      expectedPropertyCosts,
      expectedOrgCosts,
      projectedNet,
      upcomingItems: upcomingItems.slice(0, 5),
    },
    alerts: {
      expiringContracts: expiringAlerts,
      failedAutomations: failedAlerts,
      lowBalanceContracts: lowBalanceAlerts,
    },
    adminEmails,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   HTML Email Template
   ═══════════════════════════════════════════════════════════════════════════ */

function fmt(n: number): string {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function colorVal(n: number): string {
  if (n > 0) return '#059669' // green-600
  if (n < 0) return '#dc2626' // red-600
  return '#6b7280' // gray-500
}

export function renderDailyBriefEmail(data: DailyBriefData): string {
  const { yesterday: y, outlook: o, alerts: a, propertyHighlights: ph } = data

  const hasAlerts = a.expiringContracts.length > 0 || a.failedAutomations.length > 0 || a.lowBalanceContracts.length > 0
  const alertCount = a.expiringContracts.length + a.failedAutomations.length + a.lowBalanceContracts.length

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Haven Daily Brief — ${data.reportDate}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f3f4f6; color: #1f2937; -webkit-font-smoothing: antialiased; }
    .wrapper { max-width: 640px; margin: 0 auto; padding: 24px 16px; }
    .card { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 16px; }
    .header { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: #fff; padding: 32px 28px 24px; }
    .header h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .header .org { margin: 0 0 2px; font-size: 14px; opacity: 0.85; font-weight: 500; }
    .header .date { margin: 0; font-size: 13px; opacity: 0.65; }
    .section { padding: 24px 28px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7280; margin: 0 0 16px; }
    .metric-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
    .metric-row:last-child { border-bottom: none; }
    .metric-label { font-size: 14px; color: #4b5563; }
    .metric-value { font-size: 14px; font-weight: 600; }
    .net-row { display: flex; justify-content: space-between; padding: 10px 0; margin-top: 4px; border-top: 2px solid #e5e7eb; }
    .net-label { font-size: 15px; font-weight: 700; color: #1f2937; }
    .net-value { font-size: 15px; font-weight: 700; }
    .stat-grid { display: flex; gap: 12px; }
    .stat-box { flex: 1; text-align: center; background: #f9fafb; border-radius: 8px; padding: 16px 8px; }
    .stat-box .val { font-size: 22px; font-weight: 700; line-height: 1.2; }
    .stat-box .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-top: 4px; font-weight: 600; }
    .prop-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 6px; }
    .prop-name { font-size: 13px; font-weight: 600; color: #1f2937; }
    .prop-net { font-size: 13px; font-weight: 700; }
    .prop-detail { font-size: 11px; color: #6b7280; }
    .upcoming-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .upcoming-item:last-child { border-bottom: none; }
    .upcoming-date { font-size: 12px; color: #6b7280; min-width: 60px; }
    .upcoming-name { font-size: 13px; color: #1f2937; flex: 1; margin: 0 8px; }
    .upcoming-amount { font-size: 13px; font-weight: 600; }
    .alert-item { padding: 10px 12px; background: #fef2f2; border-radius: 8px; margin-bottom: 6px; border-left: 3px solid #ef4444; }
    .alert-item.warning { background: #fffbeb; border-left-color: #f59e0b; }
    .alert-item .alert-title { font-size: 13px; font-weight: 600; color: #1f2937; }
    .alert-item .alert-detail { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .footer { text-align: center; padding: 20px 28px; }
    .footer p { margin: 0; font-size: 12px; color: #9ca3af; }
    .footer a { color: #4f46e5; text-decoration: none; font-weight: 500; }
    .cta-btn { display: inline-block; background: #4f46e5; color: #fff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px; }
    .divider { height: 1px; background: #e5e7eb; margin: 0; }
    @media (max-width: 480px) {
      .stat-grid { flex-direction: column; }
      .wrapper { padding: 12px 8px; }
      .section { padding: 20px 16px; }
      .header { padding: 24px 16px 20px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header -->
    <div class="card">
      <div class="header">
        <h1>☀️ Daily Brief</h1>
        <p class="org">${esc(data.orgName)}</p>
        <p class="date">${esc(data.reportDate)}</p>
      </div>

      <!-- Executive Snapshot -->
      <div class="section">
        <div class="section-title">Yesterday's Performance</div>
        <div class="stat-grid">
          <div class="stat-box">
            <div class="val" style="color: #059669;">$${fmt(y.income)}</div>
            <div class="lbl">Income</div>
          </div>
          <div class="stat-box">
            <div class="val" style="color: #dc2626;">$${fmt(y.propertyCosts)}</div>
            <div class="lbl">Property Costs</div>
          </div>
          <div class="stat-box">
            <div class="val" style="color: #dc2626;">$${fmt(y.orgCosts)}</div>
            <div class="lbl">Org Costs</div>
          </div>
        </div>
        <div class="net-row">
          <span class="net-label">Net Result</span>
          <span class="net-value" style="color: ${colorVal(y.net)};">$${fmt(y.net)}</span>
        </div>
        <div style="text-align: center; margin-top: 8px; font-size: 12px; color: #9ca3af;">
          ${y.transactionCount} transaction${y.transactionCount !== 1 ? 's' : ''} · ${y.expenseCount} expense${y.expenseCount !== 1 ? 's' : ''}
        </div>
      </div>

      ${ph.length > 0 ? `
      <div class="divider"></div>
      <div class="section">
        <div class="section-title">Property Highlights</div>
        ${ph.map(p => `
        <div class="prop-row">
          <div>
            <div class="prop-name">${esc(p.propertyName)}</div>
            <div class="prop-detail">Income $${fmt(p.income)} · Costs $${fmt(p.expenses)}</div>
          </div>
          <div class="prop-net" style="color: ${colorVal(p.net)};">$${fmt(p.net)}</div>
        </div>
        `).join('')}
      </div>
      ` : ''}
    </div>

    <!-- Outlook -->
    <div class="card">
      <div class="section">
        <div class="section-title">Next 7 Days Outlook</div>
        <div class="metric-row">
          <span class="metric-label">Expected Income</span>
          <span class="metric-value" style="color: #059669;">$${fmt(o.expectedIncome)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Expected Property Costs</span>
          <span class="metric-value" style="color: #dc2626;">$${fmt(o.expectedPropertyCosts)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Expected Org Costs</span>
          <span class="metric-value" style="color: #dc2626;">$${fmt(o.expectedOrgCosts)}</span>
        </div>
        <div class="net-row">
          <span class="net-label">Projected Net</span>
          <span class="net-value" style="color: ${colorVal(o.projectedNet)};">$${fmt(o.projectedNet)}</span>
        </div>

        ${o.upcomingItems.length > 0 ? `
        <div style="margin-top: 16px;">
          <div class="section-title" style="margin-bottom: 8px;">Upcoming Items</div>
          ${o.upcomingItems.map(item => `
          <div class="upcoming-item">
            <span class="upcoming-date">${esc(item.date)}</span>
            <span class="upcoming-name">${esc(item.name)}${item.property ? ` <span style="color:#9ca3af;">· ${esc(item.property)}</span>` : ''}</span>
            <span class="upcoming-amount">$${fmt(item.amount)}</span>
          </div>
          `).join('')}
        </div>
        ` : ''}
      </div>
    </div>

    ${hasAlerts ? `
    <!-- Alerts -->
    <div class="card">
      <div class="section">
        <div class="section-title">⚠️ Attention Required (${alertCount})</div>

        ${a.failedAutomations.length > 0 ? `
        <div style="margin-bottom: 12px;">
          <div style="font-size: 12px; font-weight: 600; color: #dc2626; margin-bottom: 6px;">Failed Automations</div>
          ${a.failedAutomations.map(f => `
          <div class="alert-item">
            <div class="alert-title">${esc(f.automationName)}</div>
            <div class="alert-detail">Failed at ${esc(f.failedAt)} — ${esc(f.error)}</div>
          </div>
          `).join('')}
        </div>
        ` : ''}

        ${a.expiringContracts.length > 0 ? `
        <div style="margin-bottom: 12px;">
          <div style="font-size: 12px; font-weight: 600; color: #d97706; margin-bottom: 6px;">Contracts Expiring Soon</div>
          ${a.expiringContracts.map(c => `
          <div class="alert-item warning">
            <div class="alert-title">${esc(c.residentName)} — ${esc(c.contractType)}</div>
            <div class="alert-detail">Expires ${esc(c.endDate)} (${c.daysRemaining} day${c.daysRemaining !== 1 ? 's' : ''})</div>
          </div>
          `).join('')}
        </div>
        ` : ''}

        ${a.lowBalanceContracts.length > 0 ? `
        <div>
          <div style="font-size: 12px; font-weight: 600; color: #d97706; margin-bottom: 6px;">Low Balance Contracts</div>
          ${a.lowBalanceContracts.map(c => `
          <div class="alert-item warning">
            <div class="alert-title">${esc(c.residentName)}</div>
            <div class="alert-detail">$${fmt(c.balance)} remaining of $${fmt(c.originalAmount)} (${c.percentRemaining}%)</div>
          </div>
          `).join('')}
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}

    <!-- CTA -->
    <div style="text-align: center; margin: 8px 0 16px;">
      <a href="${data.baseUrl}/dashboard" class="cta-btn">Open Haven Dashboard →</a>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Haven Daily Brief · ${esc(data.orgName)}</p>
      <p style="margin-top: 4px;">
        <a href="${data.baseUrl}/automations">Manage automations</a> ·
        <a href="${data.baseUrl}/transactions">Transactions</a> ·
        <a href="${data.baseUrl}/houses">Houses</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
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
  const subject = `☀️ Haven Daily Brief — ${data.reportDate}`

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

