-- QUICK: Set all active contracts to tomorrow
-- Just paste this in Supabase SQL Editor and run

UPDATE funding_contracts
SET next_run_date = CURRENT_DATE + INTERVAL '1 day',
    updated_at = NOW()
WHERE auto_billing_enabled = true
  AND contract_status = 'Active'
  AND current_balance > 0
RETURNING 
  id,
  contract_name,
  next_run_date,
  automated_drawdown_frequency,
  organization_id;

