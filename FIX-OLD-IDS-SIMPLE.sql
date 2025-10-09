-- ========================================
-- SIMPLE FIX FOR OLD TRANSACTION IDs
-- ========================================
-- Step-by-step guide to fix the 5 old transactions

-- ========================================
-- STEP 1: Find your current highest TXN ID
-- ========================================
SELECT id 
FROM transactions
WHERE id ~ '^TXN-[A-Z]\d{6}$'
ORDER BY id DESC
LIMIT 1;

-- Example output: TXN-A000010
-- Your next ID should be: TXN-A000011

-- ========================================
-- STEP 2: View the old transactions (in chronological order)
-- ========================================
SELECT 
  id as old_id,
  description,
  amount,
  created_at,
  ROW_NUMBER() OVER (ORDER BY created_at) as sequence_number
FROM transactions
WHERE created_by = 'automation-system'
  AND NOT (id ~ '^TXN-[A-Z]\d{6}$')
ORDER BY created_at;

-- Based on your CSV, these are:
-- 1. hl1w1fcvdygmfyiwa40 - $441.18 - 2025-09-24 21:55:34
-- 2. pzplle4lyhgmfyiwaby - $97.40  - 2025-09-24 21:55:34
-- 3. ajcmgpwlvikmgin212w - $1500.00 - 2025-10-08 23:47:24
-- 4. 8kqsyd58bmmginj4ps - $1500.00 - 2025-10-09 00:00:42
-- 5. nyenjnd7c5mginj657 - $1500.00 - 2025-10-09 00:00:44

-- ========================================
-- STEP 3: UPDATE EACH TRANSACTION
-- ========================================
-- IMPORTANT: Adjust the new IDs based on your current highest TXN ID
-- If your highest is TXN-A000010, use A000011, A000012, etc.
-- If your highest is TXN-A000020, use A000021, A000022, etc.

-- Replace 'TXN-A000011' with your actual next sequential ID:

-- Transaction 1 (oldest)
UPDATE transactions 
SET id = 'TXN-A000011' 
WHERE id = 'hl1w1fcvdygmfyiwa40';

-- Transaction 2
UPDATE transactions 
SET id = 'TXN-A000012' 
WHERE id = 'pzplle4lyhgmfyiwaby';

-- Transaction 3
UPDATE transactions 
SET id = 'TXN-A000013' 
WHERE id = 'ajcmgpwlvikmgin212w';

-- Transaction 4
UPDATE transactions 
SET id = 'TXN-A000014' 
WHERE id = '8kqsyd58bmmginj4ps';

-- Transaction 5 (newest)
UPDATE transactions 
SET id = 'TXN-A000015' 
WHERE id = 'nyenjnd7c5mginj657';

-- ========================================
-- STEP 4: UPDATE AUDIT LOG REFERENCES (if any)
-- ========================================

-- Check if there are any audit log references
SELECT 
  id,
  details->>'transaction_id' as transaction_id_ref
FROM audit_logs
WHERE details->>'transaction_id' IN (
  'hl1w1fcvdygmfyiwa40',
  'pzplle4lyhgmfyiwaby',
  'ajcmgpwlvikmgin212w',
  '8kqsyd58bmmginj4ps',
  'nyenjnd7c5mginj657'
);

-- If any found, update them:
UPDATE audit_logs
SET details = jsonb_set(details, '{transaction_id}', '"TXN-A000011"'::jsonb)
WHERE details->>'transaction_id' = 'hl1w1fcvdygmfyiwa40';

UPDATE audit_logs
SET details = jsonb_set(details, '{transaction_id}', '"TXN-A000012"'::jsonb)
WHERE details->>'transaction_id' = 'pzplle4lyhgmfyiwaby';

UPDATE audit_logs
SET details = jsonb_set(details, '{transaction_id}', '"TXN-A000013"'::jsonb)
WHERE details->>'transaction_id' = 'ajcmgpwlvikmgin212w';

UPDATE audit_logs
SET details = jsonb_set(details, '{transaction_id}', '"TXN-A000014"'::jsonb)
WHERE details->>'transaction_id' = '8kqsyd58bmmginj4ps';

UPDATE audit_logs
SET details = jsonb_set(details, '{transaction_id}', '"TXN-A000015"'::jsonb)
WHERE details->>'transaction_id' = 'nyenjnd7c5mginj657';

-- ========================================
-- STEP 5: VERIFY ALL TRANSACTIONS NOW HAVE PROPER IDs
-- ========================================

-- Check all automated transactions
SELECT 
  id,
  description,
  amount,
  created_at,
  CASE 
    WHEN id ~ '^TXN-[A-Z]\d{6}$' THEN '✅ Valid'
    ELSE '❌ Invalid'
  END as format_check
FROM transactions
WHERE created_by = 'automation-system'
ORDER BY created_at;

-- All should show ✅ Valid

-- Check for any remaining invalid IDs
SELECT COUNT(*) as invalid_count
FROM transactions
WHERE NOT (id ~ '^TXN-[A-Z]\d{6}$');

-- Should return 0

-- Check for duplicate IDs
SELECT id, COUNT(*) as count
FROM transactions
GROUP BY id
HAVING COUNT(*) > 1;

-- Should return no rows

-- ========================================
-- STEP 6: VIEW ALL TRANSACTIONS IN SEQUENCE
-- ========================================

SELECT 
  id,
  created_by,
  status,
  amount,
  description,
  created_at
FROM transactions
ORDER BY id;

-- All should be in proper TXN-A000001, TXN-A000002, etc. format

-- ========================================
-- SUMMARY REPORT
-- ========================================

SELECT 
  'Total Transactions' as metric,
  COUNT(*)::TEXT as value
FROM transactions
UNION ALL
SELECT 
  'Automated Transactions' as metric,
  COUNT(*)::TEXT as value
FROM transactions
WHERE created_by = 'automation-system'
UNION ALL
SELECT 
  'Valid Format Count' as metric,
  COUNT(*)::TEXT as value
FROM transactions
WHERE id ~ '^TXN-[A-Z]\d{6}$'
UNION ALL
SELECT 
  'Invalid Format Count' as metric,
  COUNT(*)::TEXT as value
FROM transactions
WHERE NOT (id ~ '^TXN-[A-Z]\d{6}$');

-- The last row should show 0 invalid transactions

-- ========================================
-- DONE! ✅
-- ========================================
-- All your transactions now use the same ID format
-- Future automated transactions will continue the sequence

