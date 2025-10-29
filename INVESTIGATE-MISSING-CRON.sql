-- INVESTIGATE: Why automation didn't run yesterday
-- Run this in Supabase SQL Editor to diagnose the issue

-- ============================================
-- 1. CHECK AUTOMATION LOGS FOR YESTERDAY
-- ============================================
SELECT 
    run_date::date as run_date,
    status,
    contracts_processed,
    contracts_skipped,
    contracts_failed,
    execution_time_ms,
    summary,
    created_at
FROM automation_logs
WHERE run_date::date >= CURRENT_DATE - INTERVAL '2 days'
ORDER BY run_date DESC
LIMIT 10;

-- ============================================
-- 2. CHECK IF AUTOMATION IS ENABLED FOR YOUR ORG
-- ============================================
SELECT 
    o.name as organization_name,
    o.id as organization_id,
    as_e.enabled as automation_enabled,
    as_e.admin_emails,
    as_e.run_time,
    as_e.timezone
FROM automation_settings as_e
JOIN organizations o ON as_e.organization_id = o.id
ORDER BY o.name;

-- ============================================
-- 3. CHECK FOR ELIGIBLE CONTRACTS (What SHOULD run)
-- ============================================
-- This shows contracts that should have been processed today/yesterday
SELECT 
    fc.id,
    r.first_name || ' ' || r.last_name as resident_name,
    fc.contract_name,
    fc.next_run_date,
    fc.automated_drawdown_frequency,
    fc.daily_support_item_cost,
    fc.current_balance,
    fc.auto_billing_enabled,
    fc.contract_status,
    CASE 
        WHEN fc.next_run_date = CURRENT_DATE THEN 'Should run TODAY'
        WHEN fc.next_run_date < CURRENT_DATE THEN 'OVDUE - Should have run already'
        WHEN fc.next_run_date > CURRENT_DATE THEN 'Scheduled for future'
    END as status
FROM funding_contracts fc
JOIN residents r ON fc.resident_id = r.id
WHERE fc.auto_billing_enabled = true
  AND fc.contract_status = 'Active'
  AND fc.next_run_date IS NOT NULL
ORDER BY fc.next_run_date;

-- ============================================
-- 4. CHECK RECENT AUTOMATION SETTINGS CHANGES
-- ============================================
SELECT 
    *,
    updated_at
FROM automation_settings
WHERE enabled = true
ORDER BY updated_at DESC;

-- ============================================
-- 5. CHECK IF THERE ARE ANY PROCESSED CONTRACTS
-- ============================================
-- Shows contracts that were processed
SELECT 
    fc.id,
    r.first_name || ' ' || r.last_name as resident_name,
    fc.contract_name,
    fc.next_run_date,
    fc.automated_drawdown_frequency,
    fc.daily_support_item_cost,
    fc.current_balance
FROM funding_contracts fc
JOIN residents r ON fc.resident_id = r.id
WHERE fc.auto_billing_enabled = true
  AND fc.contract_status = 'Active'
  AND fc.next_run_date < CURRENT_DATE
ORDER BY fc.next_run_date;

-- ============================================
-- 6. CHECK VERCEL CRON JOB CONFIGURATION
-- ============================================
-- NOTE: You need to manually check in Vercel:
-- Go to: https://vercel.com/your-project/settings/cron-jobs
-- Verify:
-- - Path: /api/automation/cron
-- - Schedule: 0 0 * * * (runs at midnight UTC daily)
-- - Last run time
-- - Status: Should be "Active"

-- ============================================
-- 7. SUMMARY - What to check
-- ============================================
-- Run this to get a summary
SELECT 
    'Automation Enabled Orgs' as check_item,
    COUNT(*) as count,
    ARRAY_AGG(o.name) as orgs
FROM automation_settings as_e
JOIN organizations o ON as_e.organization_id = o.id
WHERE as_e.enabled = true

UNION ALL

SELECT 
    'Eligible Contracts (ready to bill)' as check_item,
    COUNT(*) as count,
    ARRAY[]::text[] as orgs
FROM funding_contracts fc
WHERE fc.auto_billing_enabled = true
  AND fc.contract_status = 'Active'
  AND fc.next_run_date <= CURRENT_DATE
  AND fc.current_balance > 0

UNION ALL

SELECT 
    'Automation Logs Last 2 Days' as check_item,
    COUNT(*) as count,
    ARRAY[]::text[] as orgs
FROM automation_logs
WHERE run_date::date >= CURRENT_DATE - INTERVAL '2 days';

-- ============================================
-- DIAGNOSIS RESULTS INTERPRETATION:
-- ============================================
-- If "Automation Enabled Orgs" = 0:
--    → Automation is disabled for your org
--    → Enable it in Settings → Automation
--
-- If "Eligible Contracts" = 0:
--    → No contracts ready to bill
--    → All contracts have next_run_date in the future
--    → This is normal if billing is up to date
--
-- If "Automation Logs Last 2 Days" = 0:
--    → Cron job didn't run
--    → Check Vercel cron job configuration
--    → Check CRON_SECRET environment variable
--    → Check Vercel deployment status
--
-- If "Automation Logs Last 2 Days" > 0:
--    → Cron DID run
--    → Check the logs to see what happened
--    → Look at "contracts_processed" and "contracts_skipped" columns

