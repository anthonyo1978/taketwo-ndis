-- Quick script to set all active contracts to tomorrow
-- Run this in Supabase SQL Editor

-- Show what will be updated
SELECT 
  o.name AS "Organization",
  r.first_name || ' ' || r.last_name AS "Resident",
  fc.contract_name AS "Contract",
  fc.next_run_date AS "Current Next Run",
  (CURRENT_DATE + INTERVAL '1 day')::DATE AS "Will Set To",
  fc.automated_drawdown_frequency AS "Frequency",
  fc.current_balance AS "Balance"
FROM funding_contracts fc
JOIN residents r ON fc.resident_id = r.id
JOIN organizations o ON fc.organization_id = o.id
WHERE fc.auto_billing_enabled = true
  AND fc.contract_status = 'Active'
  AND fc.daily_support_item_cost > 0
  AND fc.automated_drawdown_frequency IS NOT NULL
  AND fc.current_balance > 0
ORDER BY o.name, r.first_name;

-- Now update them to tomorrow
UPDATE funding_contracts
SET next_run_date = (CURRENT_DATE + INTERVAL '1 day')::DATE,
    updated_at = NOW()
WHERE auto_billing_enabled = true
  AND contract_status = 'Active'
  AND daily_support_item_cost > 0
  AND automated_drawdown_frequency IS NOT NULL
  AND current_balance > 0;

-- Verify the update
SELECT 
  o.name AS "Organization",
  COUNT(*) AS "Contracts Ready",
  MIN(fc.next_run_date) AS "Earliest Run",
  MAX(fc.next_run_date) AS "Latest Run"
FROM funding_contracts fc
JOIN organizations o ON fc.organization_id = o.id
WHERE fc.auto_billing_enabled = true
  AND fc.contract_status = 'Active'
  AND fc.next_run_date = (CURRENT_DATE + INTERVAL '1 day')::DATE
GROUP BY o.name
ORDER BY o.name;

