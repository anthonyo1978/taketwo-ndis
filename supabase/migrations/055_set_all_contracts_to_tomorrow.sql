-- Migration: Set all active contracts to tomorrow's date for automation testing
-- This sets next_run_date to tomorrow in Australian timezone
-- so they'll all be picked up by tomorrow's automated run

BEGIN;

-- Set all active, auto-billing contracts to tomorrow's date
-- Using CURRENT_DATE + 1 which is tomorrow in UTC,
-- but since next_run_date is a DATE (no timezone),
-- we need to calculate tomorrow in Australian timezone

UPDATE funding_contracts
SET next_run_date = (CURRENT_DATE AT TIME ZONE 'Australia/Sydney' + INTERVAL '1 day')::DATE
WHERE auto_billing_enabled = true
  AND contract_status = 'Active'
  AND daily_support_item_cost > 0
  AND automated_drawdown_frequency IS NOT NULL
  AND current_balance > 0;

-- Show results
SELECT 
  COUNT(*) AS contracts_updated,
  MIN(next_run_date) AS earliest_next_run,
  MAX(next_run_date) AS latest_next_run
FROM funding_contracts
WHERE auto_billing_enabled = true
  AND contract_status = 'Active'
  AND next_run_date >= CURRENT_DATE;

-- Show breakdown by organization
SELECT 
  o.name AS organization_name,
  COUNT(fc.id) AS contracts_scheduled,
  MIN(fc.next_run_date) AS earliest_run,
  MAX(fc.next_run_date) AS latest_run
FROM funding_contracts fc
JOIN organizations o ON fc.organization_id = o.id
WHERE fc.auto_billing_enabled = true
  AND fc.contract_status = 'Active'
GROUP BY o.id, o.name
ORDER BY contracts_scheduled DESC;

COMMIT;

-- Verification query (run after migration)
-- SELECT 
--   id,
--   contract_name,
--   next_run_date,
--   automated_drawdown_frequency,
--   current_balance,
--   organization_id
-- FROM funding_contracts
-- WHERE auto_billing_enabled = true
--   AND contract_status = 'Active'
-- ORDER BY next_run_date, organization_id;

