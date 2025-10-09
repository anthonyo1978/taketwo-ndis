-- ============================================================================
-- SETUP AUTOMATED BATCH TEST
-- This creates a contract that will run in the NEXT HOUR
-- ============================================================================

-- IMPORTANT: Run CHECK-CURRENT-DATA.sql first to see what you have!

-- ============================================================================
-- OPTION 1: Update Bill Maher's contract to run in the next hour
-- ============================================================================

-- Get current time info
SELECT 
  NOW() as current_time_utc,
  NOW() AT TIME ZONE 'Australia/Sydney' as current_time_sydney,
  DATE_TRUNC('hour', NOW() + INTERVAL '1 hour') as next_hour_utc,
  DATE_TRUNC('hour', NOW() + INTERVAL '1 hour') AT TIME ZONE 'Australia/Sydney' as next_hour_sydney;

-- Update Bill's contract to run in the next hour
UPDATE funding_contracts
SET 
  next_run_date = DATE_TRUNC('day', NOW() + INTERVAL '1 hour'),  -- Next hour (rounded to day for daily contracts)
  last_run_date = NOW() - INTERVAL '1 day',                       -- Pretend it ran yesterday
  auto_billing_enabled = true,
  automated_drawdown_frequency = 'daily',
  contract_status = 'Active',
  end_date = NOW() + INTERVAL '30 days',                          -- Ensure not expired
  current_balance = 10000.00,                                     -- Ensure has balance
  updated_at = NOW()
WHERE resident_id = (
  SELECT id FROM residents 
  WHERE first_name = 'Bill' AND last_name = 'Maher'
  LIMIT 1
)
RETURNING 
  id,
  next_run_date,
  last_run_date,
  current_balance,
  automated_drawdown_frequency;

-- ============================================================================
-- OPTION 2: Create a fresh test resident + contract
-- ============================================================================

-- Create test house (if needed)
INSERT INTO houses (
  id,
  descriptor,
  address1,
  city,
  state,
  postcode,
  country,
  status,
  created_by,
  updated_by
) VALUES (
  gen_random_uuid(),
  'Test Automation House',
  '123 Test Street',
  'Sydney',
  'NSW',
  '2000',
  'Australia',
  'Active',
  'system',
  'system'
)
ON CONFLICT (id) DO NOTHING
RETURNING id, descriptor;

-- Create test resident
WITH new_house AS (
  SELECT id FROM houses WHERE descriptor = 'Test Automation House' LIMIT 1
)
INSERT INTO residents (
  id,
  house_id,
  first_name,
  last_name,
  date_of_birth,
  gender,
  status,
  preferences,
  created_by,
  updated_by
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM new_house),
  'Auto',
  'TestUser',
  '1990-01-01',
  'Prefer not to say',
  'Active',
  '{}',
  'system',
  'system'
)
ON CONFLICT (id) DO NOTHING
RETURNING id, first_name, last_name;

-- Create funding contract for test resident
WITH test_resident AS (
  SELECT id FROM residents WHERE first_name = 'Auto' AND last_name = 'TestUser' LIMIT 1
)
INSERT INTO funding_contracts (
  id,
  resident_id,
  contract_status,
  start_date,
  end_date,
  original_amount,
  current_balance,
  auto_billing_enabled,
  automated_drawdown_frequency,
  automated_drawdown_amount,
  next_run_date,
  last_run_date,
  created_by,
  updated_by
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM test_resident),
  'Active',
  NOW() - INTERVAL '7 days',                                      -- Started a week ago
  NOW() + INTERVAL '30 days',                                     -- Expires in 30 days
  50000.00,                                                       -- $50,000 total
  50000.00,                                                       -- Full balance available
  true,                                                           -- Auto-billing enabled
  'daily',                                                        -- Daily frequency
  100.00,                                                         -- $100 per day
  DATE_TRUNC('day', NOW() + INTERVAL '1 hour'),                  -- Next run = next hour
  NOW() - INTERVAL '1 day',                                       -- Last run = yesterday
  'system',
  'system'
)
ON CONFLICT (id) DO NOTHING
RETURNING 
  id,
  next_run_date,
  last_run_date,
  current_balance,
  automated_drawdown_frequency,
  automated_drawdown_amount;

-- ============================================================================
-- VERIFY SETUP
-- ============================================================================

-- Check what will run in the next hour
SELECT 
  fc.id as contract_id,
  r.first_name || ' ' || r.last_name as resident_name,
  fc.next_run_date,
  fc.automated_drawdown_frequency,
  fc.automated_drawdown_amount,
  fc.current_balance,
  fc.contract_status,
  fc.auto_billing_enabled,
  CASE 
    WHEN fc.next_run_date <= NOW() + INTERVAL '1 hour' THEN '✅ Will run in next hour'
    ELSE '⏰ Scheduled for later'
  END as status
FROM funding_contracts fc
JOIN residents r ON r.id = fc.resident_id
WHERE fc.auto_billing_enabled = true
  AND fc.contract_status = 'Active'
ORDER BY fc.next_run_date ASC;

-- ============================================================================
-- NOTES
-- ============================================================================

-- The cron job runs HOURLY (every hour at :00)
-- It processes contracts where next_run_date = TODAY
-- 
-- For daily contracts:
--   - next_run_date is set to the DATE (not time)
--   - So it will run on any hour of that day
--
-- To test:
-- 1. Run OPTION 1 or OPTION 2 above
-- 2. Wait for the next hour (or trigger manually)
-- 3. Check your email!
-- 4. Run CHECK-CURRENT-DATA.sql to verify

