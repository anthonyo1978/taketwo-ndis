-- ============================================================================
-- DIAGNOSTIC: Double drawdown for resident 753461ba-a9ea-43d4-8982-597e78c612d2
-- Run these queries against your Supabase database
-- ============================================================================

-- 1. Resident info
SELECT id, first_name, last_name, status, house_id
FROM residents
WHERE id = '753461ba-a9ea-43d4-8982-597e78c612d2';

-- 2. ALL funding contracts for this resident — LOOK FOR DUPLICATES WITH auto_billing_enabled
SELECT 
  id,
  type,
  contract_status,
  is_active,
  original_amount,
  current_balance,
  auto_billing_enabled,
  automated_drawdown_frequency,
  daily_support_item_cost,
  support_item_code,
  next_run_date,
  first_run_date,
  start_date,
  end_date,
  created_at
FROM funding_contracts
WHERE resident_id = '753461ba-a9ea-43d4-8982-597e78c612d2'
ORDER BY created_at DESC;

-- 3. Contracts with automation enabled (this is the smoking gun)
SELECT 
  COUNT(*) AS total_contracts,
  COUNT(*) FILTER (WHERE auto_billing_enabled = true) AS automation_enabled_count,
  COUNT(*) FILTER (WHERE auto_billing_enabled = true AND contract_status = 'Active') AS active_with_automation
FROM funding_contracts
WHERE resident_id = '753461ba-a9ea-43d4-8982-597e78c612d2';

-- 4. Recent transactions — look for doubled entries on the same day
SELECT 
  id,
  contract_id,
  amount,
  occurred_at,
  status,
  drawdown_status,
  description,
  created_by,
  created_at
FROM transactions
WHERE resident_id = '753461ba-a9ea-43d4-8982-597e78c612d2'
ORDER BY occurred_at DESC, created_at DESC
LIMIT 40;

-- 5. Transactions grouped by date — confirms the doubling pattern
SELECT 
  occurred_at::date AS txn_date,
  COUNT(*) AS txn_count,
  SUM(amount) AS total_amount,
  array_agg(DISTINCT contract_id) AS contract_ids,
  array_agg(id ORDER BY created_at) AS transaction_ids
FROM transactions
WHERE resident_id = '753461ba-a9ea-43d4-8982-597e78c612d2'
  AND occurred_at >= NOW() - INTERVAL '30 days'
GROUP BY occurred_at::date
HAVING COUNT(*) > 1
ORDER BY txn_date DESC;

-- ============================================================================
-- FIX: Disable automation on the DUPLICATE contract
-- ============================================================================
-- After running the diagnostics above, identify which contract is the
-- duplicate (usually the older one or the one with the wrong balance).
-- Then run:
--
-- UPDATE funding_contracts
-- SET auto_billing_enabled = false,
--     updated_at = NOW()
-- WHERE id = '<DUPLICATE_CONTRACT_ID>';
--
-- ============================================================================
-- ALTERNATIVE FIX: If you want to delete duplicate transactions
-- ============================================================================
-- First, identify the duplicate transaction IDs from query #5 above.
-- For each date that has 2 transactions, delete the second one:
--
-- DELETE FROM transactions
-- WHERE id IN (
--   SELECT id FROM (
--     SELECT id, 
--           ROW_NUMBER() OVER (PARTITION BY occurred_at::date ORDER BY created_at ASC) AS rn
--     FROM transactions
--     WHERE resident_id = '753461ba-a9ea-43d4-8982-597e78c612d2'
--       AND created_by = 'automation-system'
--   ) ranked
--   WHERE rn > 1
-- );
