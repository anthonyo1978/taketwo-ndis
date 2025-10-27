-- ============================================================================
-- RESET ALL ACTIVE CONTRACTS TO RUN TODAY
-- This will set next_run_date to today for all contracts eligible for automation
-- ============================================================================

-- Step 1: Update all active contracts with automation enabled to run today
UPDATE funding_contracts
SET 
  next_run_date = CURRENT_DATE,  -- Set to today (DATE format, no timezone)
  updated_at = NOW()
WHERE 
  auto_billing_enabled = true
  AND contract_status = 'Active'
  AND automated_drawdown_frequency IS NOT NULL
  AND daily_support_item_cost IS NOT NULL
  AND daily_support_item_cost > 0
  AND current_balance > 0;

-- Step 2: Show how many contracts were updated
SELECT 
  'Updated contracts: ' || COUNT(*) AS message
FROM funding_contracts
WHERE 
  auto_billing_enabled = true
  AND contract_status = 'Active'
  AND next_run_date = CURRENT_DATE;

-- Step 3: Show breakdown by frequency
SELECT 
  automated_drawdown_frequency,
  COUNT(*) AS contract_count,
  SUM(current_balance) AS total_balance
FROM funding_contracts
WHERE 
  auto_billing_enabled = true
  AND contract_status = 'Active'
  AND next_run_date = CURRENT_DATE
GROUP BY automated_drawdown_frequency;

-- Migration complete - all active contracts now have next_run_date set to today

