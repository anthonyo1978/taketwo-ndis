-- ========================================
-- DIAGNOSE AUTOMATION FAILURE
-- ========================================
-- Run these queries to find out why automation failed

-- ========================================
-- STEP 1: Check the latest automation log
-- ========================================
SELECT 
  run_date,
  status,
  contracts_processed,
  contracts_skipped,
  contracts_failed,
  execution_time_ms,
  errors,
  summary
FROM automation_logs
ORDER BY run_date DESC
LIMIT 1;

-- This should show you the specific error messages

-- ========================================
-- STEP 2: Check eligible contracts
-- ========================================
SELECT 
  fc.id as contract_id,
  r.id as resident_id,
  r.first_name || ' ' || r.last_name as resident_name,
  r.status as resident_status,
  h.status as house_status,
  fc.contract_status,
  fc.auto_billing_enabled,
  fc.automated_drawdown_frequency,
  fc.daily_support_item_cost,
  fc.current_balance,
  fc.next_run_date,
  fc.start_date,
  fc.end_date,
  -- Calculate expected transaction amount
  CASE fc.automated_drawdown_frequency
    WHEN 'daily' THEN fc.daily_support_item_cost * 1
    WHEN 'weekly' THEN fc.daily_support_item_cost * 7
    WHEN 'fortnightly' THEN fc.daily_support_item_cost * 14
    ELSE 0
  END as expected_transaction_amount,
  -- Check eligibility
  CASE 
    WHEN NOT fc.auto_billing_enabled THEN '❌ Automation not enabled'
    WHEN fc.contract_status != 'Active' THEN '❌ Contract not active (' || fc.contract_status || ')'
    WHEN r.status != 'Active' THEN '❌ Resident not active (' || r.status || ')'
    WHEN h.status != 'Active' THEN '❌ House not active (' || h.status || ')'
    WHEN fc.daily_support_item_cost IS NULL THEN '❌ No daily rate set'
    WHEN fc.daily_support_item_cost <= 0 THEN '❌ Invalid daily rate'
    WHEN fc.automated_drawdown_frequency IS NULL THEN '❌ No frequency set'
    WHEN fc.next_run_date IS NULL THEN '❌ No next run date set'
    WHEN fc.next_run_date > CURRENT_DATE THEN '⏰ Not scheduled yet (next: ' || fc.next_run_date || ')'
    WHEN fc.current_balance < (
      CASE fc.automated_drawdown_frequency
        WHEN 'daily' THEN fc.daily_support_item_cost * 1
        WHEN 'weekly' THEN fc.daily_support_item_cost * 7
        WHEN 'fortnightly' THEN fc.daily_support_item_cost * 14
        ELSE 0
      END
    ) THEN '❌ Insufficient balance (has: $' || fc.current_balance || ', needs: $' || 
      CASE fc.automated_drawdown_frequency
        WHEN 'daily' THEN fc.daily_support_item_cost * 1
        WHEN 'weekly' THEN fc.daily_support_item_cost * 7
        WHEN 'fortnightly' THEN fc.daily_support_item_cost * 14
      END || ')'
    WHEN fc.start_date IS NOT NULL AND CURRENT_DATE < fc.start_date THEN '❌ Before start date'
    WHEN fc.end_date IS NOT NULL AND CURRENT_DATE > fc.end_date THEN '❌ After end date'
    ELSE '✅ ELIGIBLE'
  END as eligibility_status
FROM funding_contracts fc
JOIN residents r ON r.id = fc.resident_id
JOIN houses h ON h.id = r.house_id
WHERE fc.auto_billing_enabled = true
ORDER BY fc.next_run_date;

-- ========================================
-- STEP 3: Check if there are issues with specific fields
-- ========================================

-- Check for contracts with NULL critical fields
SELECT 
  fc.id,
  r.first_name || ' ' || r.last_name as resident_name,
  fc.daily_support_item_cost IS NULL as missing_daily_rate,
  fc.automated_drawdown_frequency IS NULL as missing_frequency,
  fc.next_run_date IS NULL as missing_next_run_date,
  fc.current_balance
FROM funding_contracts fc
JOIN residents r ON r.id = fc.resident_id
WHERE fc.auto_billing_enabled = true;

-- ========================================
-- STEP 4: Check recent transactions table structure
-- ========================================

-- Verify the transactions table accepts NULL for posted fields
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name IN ('posted_at', 'posted_by', 'status', 'drawdown_status')
ORDER BY ordinal_position;

-- posted_at and posted_by should show is_nullable = 'YES'

-- ========================================
-- STEP 5: Try creating a test transaction manually
-- ========================================

-- This tests if the database accepts draft transactions with NULL posted fields
-- DON'T RUN THIS YET - just see if it would work:

/*
INSERT INTO transactions (
  id,
  resident_id,
  contract_id,
  occurred_at,
  description,
  quantity,
  unit_price,
  amount,
  status,
  drawdown_status,
  is_drawdown_transaction,
  created_by,
  posted_at,
  posted_by
) VALUES (
  'TEST-000001',
  (SELECT id FROM residents WHERE status = 'Active' LIMIT 1),
  (SELECT id FROM funding_contracts WHERE auto_billing_enabled = true LIMIT 1),
  NOW(),
  'Test draft transaction',
  1,
  100.00,
  100.00,
  'draft',
  'draft',
  true,
  'test-system',
  NULL,  -- Testing NULL
  NULL   -- Testing NULL
) RETURNING id, status, posted_at, posted_by;

-- If this works, the schema is fine
-- Then DELETE the test:
DELETE FROM transactions WHERE id = 'TEST-000001';
*/

-- ========================================
-- COMMON ISSUES TO CHECK
-- ========================================

-- Issue 1: Missing daily_support_item_cost
SELECT 
  id,
  type,
  amount,
  duration_days,
  daily_support_item_cost,
  CASE 
    WHEN daily_support_item_cost IS NULL THEN 'Need to set daily rate'
    WHEN daily_support_item_cost <= 0 THEN 'Invalid rate'
    ELSE 'OK'
  END as rate_status
FROM funding_contracts
WHERE auto_billing_enabled = true;

-- Issue 2: Invalid frequency
SELECT 
  id,
  automated_drawdown_frequency,
  CASE 
    WHEN automated_drawdown_frequency NOT IN ('daily', 'weekly', 'fortnightly') THEN 'Invalid frequency'
    ELSE 'OK'
  END as frequency_status
FROM funding_contracts
WHERE auto_billing_enabled = true;

-- Issue 3: Insufficient balance
SELECT 
  fc.id,
  r.first_name || ' ' || r.last_name as resident_name,
  fc.current_balance,
  fc.daily_support_item_cost,
  fc.automated_drawdown_frequency,
  CASE fc.automated_drawdown_frequency
    WHEN 'daily' THEN fc.daily_support_item_cost * 1
    WHEN 'weekly' THEN fc.daily_support_item_cost * 7
    WHEN 'fortnightly' THEN fc.daily_support_item_cost * 14
  END as required_amount,
  fc.current_balance - CASE fc.automated_drawdown_frequency
    WHEN 'daily' THEN fc.daily_support_item_cost * 1
    WHEN 'weekly' THEN fc.daily_support_item_cost * 7
    WHEN 'fortnightly' THEN fc.daily_support_item_cost * 14
  END as balance_after_transaction,
  CASE 
    WHEN fc.current_balance < CASE fc.automated_drawdown_frequency
      WHEN 'daily' THEN fc.daily_support_item_cost * 1
      WHEN 'weekly' THEN fc.daily_support_item_cost * 7
      WHEN 'fortnightly' THEN fc.daily_support_item_cost * 14
    END THEN '❌ Insufficient'
    ELSE '✅ Sufficient'
  END as balance_status
FROM funding_contracts fc
JOIN residents r ON r.id = fc.resident_id
WHERE fc.auto_billing_enabled = true;

-- ========================================
-- MOST LIKELY ISSUE: daily_support_item_cost
-- ========================================

-- Check if your new client contracts have this field set
SELECT 
  fc.id,
  r.first_name || ' ' || r.last_name as resident,
  fc.amount as total_contract_amount,
  fc.duration_days,
  fc.daily_support_item_cost,
  CASE 
    WHEN fc.daily_support_item_cost IS NULL THEN 
      '❌ NOT SET - Run this: UPDATE funding_contracts SET daily_support_item_cost = amount / NULLIF(duration_days, 0) WHERE id = ''' || fc.id || ''';'
    ELSE
      '✅ Set to $' || fc.daily_support_item_cost::TEXT
  END as fix_needed
FROM funding_contracts fc
JOIN residents r ON r.id = fc.resident_id
WHERE fc.auto_billing_enabled = true;

-- ========================================
-- QUICK FIX: Set daily rates for contracts missing them
-- ========================================

-- This calculates and sets the daily rate for any contract missing it:
UPDATE funding_contracts
SET daily_support_item_cost = amount / NULLIF(duration_days, 0)
WHERE auto_billing_enabled = true
  AND (daily_support_item_cost IS NULL OR daily_support_item_cost = 0)
  AND duration_days > 0;

-- Verify it worked:
SELECT 
  id,
  amount,
  duration_days,
  daily_support_item_cost,
  amount / NULLIF(duration_days, 0) as calculated_rate
FROM funding_contracts
WHERE auto_billing_enabled = true;

