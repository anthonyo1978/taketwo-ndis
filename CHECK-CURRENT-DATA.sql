-- ============================================================================
-- CHECK CURRENT TEST DATA
-- Run this in Supabase SQL Editor to see what we have
-- ============================================================================

-- 1. Check residents
SELECT 
  id,
  first_name,
  last_name,
  status
FROM residents
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check funding contracts
SELECT 
  fc.id,
  r.first_name || ' ' || r.last_name as resident_name,
  fc.contract_status,
  fc.start_date,
  fc.end_date,
  fc.original_amount,
  fc.current_balance,
  fc.auto_billing_enabled,
  fc.automated_drawdown_frequency,
  fc.next_run_date,
  fc.last_run_date
FROM funding_contracts fc
JOIN residents r ON r.id = fc.resident_id
WHERE fc.auto_billing_enabled = true
ORDER BY fc.next_run_date ASC;

-- 3. Check recent transactions
SELECT 
  t.id,
  r.first_name || ' ' || r.last_name as resident_name,
  t.amount,
  t.status,
  t.drawdown_status,
  t.created_by,
  t.created_at
FROM transactions t
JOIN residents r ON r.id = t.resident_id
WHERE t.created_by = 'automation-system'
ORDER BY t.created_at DESC
LIMIT 10;

-- 4. Check automation logs
SELECT 
  run_date,
  status,
  contracts_processed,
  contracts_failed,
  execution_time_ms,
  summary
FROM automation_logs
ORDER BY run_date DESC
LIMIT 5;

-- 5. Check automation settings
SELECT 
  enabled,
  run_time,
  timezone,
  admin_emails
FROM automation_settings
WHERE organization_id = '00000000-0000-0000-0000-000000000000';

