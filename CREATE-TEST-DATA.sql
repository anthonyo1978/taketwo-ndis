-- ========================================
-- CREATE TEST DATA FOR AUTOMATION TESTING
-- ========================================
-- Run this in your Supabase SQL Editor to create test data for automation

-- Step 1: Create or update automation settings
INSERT INTO automation_settings (
  organization_id,
  enabled,
  run_time,
  timezone,
  admin_emails,
  notification_settings,
  error_handling,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  true, -- Enable automation
  '02:00:00', -- Run at 2 AM (not used when isHourlySchedule is true)
  'Australia/Sydney',
  ARRAY['admin@example.com']::text[], -- Replace with your email
  jsonb_build_object(
    'frequency', 'endOfRun',
    'includeLogs', true
  ),
  jsonb_build_object(
    'continueOnError', true
  ),
  NOW(),
  NOW()
)
ON CONFLICT (organization_id) 
DO UPDATE SET
  enabled = EXCLUDED.enabled,
  run_time = EXCLUDED.run_time,
  timezone = EXCLUDED.timezone,
  admin_emails = EXCLUDED.admin_emails,
  notification_settings = EXCLUDED.notification_settings,
  error_handling = EXCLUDED.error_handling,
  updated_at = NOW();

-- Step 2: Check if you have any existing residents and houses
-- If not, you'll need to create them first in the UI

-- Check existing data:
SELECT 
  'Houses' as table_name,
  COUNT(*) as count
FROM houses
WHERE status = 'Active'
UNION ALL
SELECT 
  'Residents' as table_name,
  COUNT(*) as count  
FROM residents
WHERE status = 'Active';

-- Step 3: Enable automation on an existing contract
-- Replace the resident_id with an actual resident ID from your database

-- First, let's see what contracts exist:
SELECT 
  fc.id as contract_id,
  r.first_name || ' ' || r.last_name as resident_name,
  r.id as resident_id,
  fc.type,
  fc.amount,
  fc.current_balance,
  fc.duration_days,
  fc.auto_billing_enabled
FROM funding_contracts fc
JOIN residents r ON r.id = fc.resident_id
WHERE fc.contract_status = 'Active'
LIMIT 10;

-- Step 4: Update a contract to enable automation
-- IMPORTANT: Replace 'YOUR_CONTRACT_ID' with an actual contract ID from above query

/*
UPDATE funding_contracts
SET 
  auto_billing_enabled = true,
  automated_drawdown_frequency = 'weekly', -- Options: 'daily', 'weekly', 'fortnightly'
  next_run_date = CURRENT_DATE, -- Run today for testing
  first_run_date = CURRENT_DATE,
  daily_support_item_cost = CASE 
    WHEN duration_days > 0 THEN amount / duration_days
    ELSE 100.00 -- Default daily rate if duration not set
  END,
  updated_at = NOW()
WHERE id = 'YOUR_CONTRACT_ID'
  AND contract_status = 'Active'
  AND current_balance > 0;
*/

-- Step 5: Verify the automation-enabled contract
SELECT 
  fc.id as contract_id,
  r.first_name || ' ' || r.last_name as resident_name,
  r.status as resident_status,
  h.descriptor as house_name,
  h.status as house_status,
  fc.type as contract_type,
  fc.amount as contract_amount,
  fc.current_balance,
  fc.duration_days,
  fc.daily_support_item_cost,
  fc.automated_drawdown_frequency,
  fc.next_run_date,
  fc.auto_billing_enabled,
  fc.contract_status,
  -- Calculate expected transaction amount
  CASE fc.automated_drawdown_frequency
    WHEN 'daily' THEN fc.daily_support_item_cost * 1
    WHEN 'weekly' THEN fc.daily_support_item_cost * 7
    WHEN 'fortnightly' THEN fc.daily_support_item_cost * 14
  END as expected_transaction_amount,
  -- Check eligibility
  CASE 
    WHEN NOT fc.auto_billing_enabled THEN '❌ Automation not enabled'
    WHEN fc.contract_status != 'Active' THEN '❌ Contract not active'
    WHEN r.status != 'Active' THEN '❌ Resident not active'
    WHEN h.status != 'Active' THEN '❌ House not active'
    WHEN fc.next_run_date > CURRENT_DATE THEN '⏰ Not scheduled yet (next run: ' || fc.next_run_date || ')'
    WHEN fc.current_balance < (
      CASE fc.automated_drawdown_frequency
        WHEN 'daily' THEN fc.daily_support_item_cost * 1
        WHEN 'weekly' THEN fc.daily_support_item_cost * 7
        WHEN 'fortnightly' THEN fc.daily_support_item_cost * 14
      END
    ) THEN '❌ Insufficient balance'
    ELSE '✅ ELIGIBLE!'
  END as eligibility_status
FROM funding_contracts fc
JOIN residents r ON r.id = fc.resident_id
JOIN houses h ON h.id = r.house_id
WHERE fc.auto_billing_enabled = true
ORDER BY fc.next_run_date;

-- ========================================
-- QUICK EXAMPLE: Create a complete test scenario
-- ========================================
-- Uncomment and modify this section if you want to create a full test scenario from scratch

/*
-- Create a test house
INSERT INTO houses (
  id,
  address1,
  suburb,
  state,
  postcode,
  country,
  status,
  descriptor,
  go_live_date,
  created_by,
  updated_by,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '123 Test Street',
  'Sydney',
  'NSW',
  '2000',
  'Australia',
  'Active',
  'Test House for Automation',
  CURRENT_DATE,
  'admin',
  'admin',
  NOW(),
  NOW()
) RETURNING id;

-- Note the house ID and use it below

-- Create a test resident
INSERT INTO residents (
  id,
  house_id, -- Use the house ID from above
  first_name,
  last_name,
  date_of_birth,
  gender,
  status,
  phone,
  email,
  preferences,
  created_by,
  updated_by,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'YOUR_HOUSE_ID', -- Replace with house ID
  'Test',
  'Resident',
  '1990-01-01',
  'Other',
  'Active',
  '0400000000',
  'test@example.com',
  '{}'::jsonb,
  'admin',
  'admin',
  NOW(),
  NOW()
) RETURNING id;

-- Note the resident ID and use it below

-- Create a test contract with automation enabled
INSERT INTO funding_contracts (
  id,
  resident_id, -- Use the resident ID from above
  type,
  amount,
  current_balance,
  start_date,
  end_date,
  duration_days,
  contract_status,
  is_active,
  auto_billing_enabled,
  automated_drawdown_frequency,
  next_run_date,
  first_run_date,
  daily_support_item_cost,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'YOUR_RESIDENT_ID', -- Replace with resident ID
  'NDIS',
  10000.00, -- $10,000 contract
  10000.00, -- Full balance available
  CURRENT_DATE - INTERVAL '30 days', -- Started 30 days ago
  CURRENT_DATE + INTERVAL '335 days', -- 365 days total
  365, -- Duration in days
  'Active',
  true,
  true, -- Automation enabled
  'weekly', -- Weekly frequency
  CURRENT_DATE, -- Next run is TODAY for testing
  CURRENT_DATE,
  27.40, -- Daily rate ($10,000 / 365 days)
  NOW(),
  NOW()
) RETURNING id, daily_support_item_cost * 7 as weekly_amount;

-- The weekly transaction amount will be: $27.40 × 7 = $191.80
*/

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check automation settings
SELECT * FROM automation_settings 
WHERE organization_id = '00000000-0000-0000-0000-000000000000';

-- Check eligible contracts (detailed)
SELECT 
  fc.id as contract_id,
  r.first_name || ' ' || r.last_name as resident,
  fc.automated_drawdown_frequency as frequency,
  fc.daily_support_item_cost as daily_rate,
  CASE fc.automated_drawdown_frequency
    WHEN 'daily' THEN fc.daily_support_item_cost * 1
    WHEN 'weekly' THEN fc.daily_support_item_cost * 7
    WHEN 'fortnightly' THEN fc.daily_support_item_cost * 14
  END as transaction_amount,
  fc.current_balance,
  fc.next_run_date,
  CASE 
    WHEN fc.next_run_date <= CURRENT_DATE THEN '✅ READY'
    ELSE '⏰ Waiting until ' || fc.next_run_date
  END as status
FROM funding_contracts fc
JOIN residents r ON r.id = fc.resident_id
WHERE fc.auto_billing_enabled = true
  AND fc.contract_status = 'Active'
  AND r.status = 'Active';

-- Check recent automation logs
SELECT 
  run_date,
  status,
  contracts_processed,
  contracts_skipped,
  contracts_failed,
  execution_time_ms,
  LEFT(summary, 200) as summary_preview
FROM automation_logs
ORDER BY run_date DESC
LIMIT 5;

-- Check transactions created by automation
SELECT 
  t.id,
  t.occurred_at,
  r.first_name || ' ' || r.last_name as resident,
  t.amount,
  t.status,
  t.description,
  t.created_by
FROM transactions t
JOIN residents r ON r.id = t.resident_id
WHERE t.created_by = 'automation-system'
ORDER BY t.created_at DESC
LIMIT 10;

