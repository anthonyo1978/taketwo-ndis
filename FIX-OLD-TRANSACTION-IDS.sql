-- ========================================
-- FIX OLD AUTOMATED TRANSACTION IDs
-- ========================================
-- This script assigns proper TXN-X000000 format IDs to old automated transactions
-- that were created with random IDs before the fix
--
-- RUN THIS IN SUPABASE SQL EDITOR

-- Step 1: Check which transactions need fixing
SELECT 
  id,
  description,
  amount,
  created_by,
  created_at,
  CASE 
    WHEN id ~ '^TXN-[A-Z]\d{6}$' THEN '✅ Valid Format'
    ELSE '❌ Needs Fixing'
  END as status
FROM transactions
WHERE created_by = 'automation-system'
ORDER BY created_at;

-- You should see 5 transactions that need fixing:
-- 8kqsyd58bmmginj4ps
-- ajcmgpwlvikmgin212w
-- hl1w1fcvdygmfyiwa40
-- nyenjnd7c5mginj657
-- pzplle4lyhgmfyiwaby

-- ========================================
-- IMPORTANT: BACKUP FIRST
-- ========================================
-- Before making changes, let's create a backup of these transactions

CREATE TEMP TABLE old_transaction_ids_backup AS
SELECT 
  id as old_id,
  resident_id,
  contract_id,
  description,
  amount,
  created_at,
  created_by
FROM transactions
WHERE created_by = 'automation-system'
  AND NOT (id ~ '^TXN-[A-Z]\d{6}$');

-- Verify backup
SELECT COUNT(*) as backed_up_count FROM old_transaction_ids_backup;

-- ========================================
-- STEP 2: Generate New Sequential IDs
-- ========================================

-- First, find the current highest TXN ID in the system
SELECT id 
FROM transactions
WHERE id ~ '^TXN-[A-Z]\d{6}$'
ORDER BY id DESC
LIMIT 1;

-- Let's say the highest is TXN-A000010 (adjust based on what you see above)
-- The new IDs should start from TXN-A000011

-- ========================================
-- STEP 3: UPDATE THE TRANSACTIONS
-- ========================================
-- This assigns new sequential IDs to the old automated transactions
-- ordered by creation date (oldest first)

DO $$
DECLARE
  old_txn RECORD;
  new_id TEXT;
  current_letter CHAR(1) := 'A'; -- Adjust this based on your current highest TXN ID
  current_number INTEGER := 11;   -- Adjust this to be +1 of your current highest number
BEGIN
  -- Loop through old automated transactions in chronological order
  FOR old_txn IN 
    SELECT id, created_at
    FROM transactions
    WHERE created_by = 'automation-system'
      AND NOT (id ~ '^TXN-[A-Z]\d{6}$')
    ORDER BY created_at ASC
  LOOP
    -- Generate the new ID
    new_id := 'TXN-' || current_letter || LPAD(current_number::TEXT, 6, '0');
    
    -- Update the transaction ID
    UPDATE transactions
    SET id = new_id
    WHERE id = old_txn.id;
    
    -- Also update any references in audit_logs
    UPDATE audit_logs
    SET details = jsonb_set(
      COALESCE(details, '{}'::jsonb),
      '{transaction_id}',
      to_jsonb(new_id)
    )
    WHERE details->>'transaction_id' = old_txn.id;
    
    RAISE NOTICE 'Updated % to %', old_txn.id, new_id;
    
    -- Increment for next transaction
    current_number := current_number + 1;
    
    -- If we hit 999999, move to next letter
    IF current_number > 999999 THEN
      current_letter := CHR(ASCII(current_letter) + 1);
      current_number := 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Completed updating % transactions', 
    (SELECT COUNT(*) FROM old_transaction_ids_backup);
END $$;

-- ========================================
-- STEP 4: VERIFY THE UPDATES
-- ========================================

-- Check all automated transactions now have proper IDs
SELECT 
  id,
  description,
  amount,
  created_at,
  CASE 
    WHEN id ~ '^TXN-[A-Z]\d{6}$' THEN '✅ Fixed'
    ELSE '❌ Still Wrong'
  END as status
FROM transactions
WHERE created_by = 'automation-system'
ORDER BY created_at;

-- Check for any remaining invalid IDs
SELECT COUNT(*) as remaining_invalid_count
FROM transactions
WHERE created_by = 'automation-system'
  AND NOT (id ~ '^TXN-[A-Z]\d{6}$');

-- Should return 0

-- ========================================
-- STEP 5: VERIFY NO ID COLLISIONS
-- ========================================

-- Check for duplicate IDs (there should be none)
SELECT id, COUNT(*) as count
FROM transactions
GROUP BY id
HAVING COUNT(*) > 1;

-- Should return no rows

-- ========================================
-- ALTERNATIVE: MANUAL UPDATE (if script above doesn't work)
-- ========================================
-- If the DO block doesn't work, you can manually update each transaction:

/*
-- First, find what your next ID should be:
SELECT id FROM transactions WHERE id ~ '^TXN-[A-Z]\d{6}$' ORDER BY id DESC LIMIT 1;

-- Then update each old transaction manually (adjust the new IDs based on your sequence):

UPDATE transactions SET id = 'TXN-A000011' WHERE id = 'hl1w1fcvdygmfyiwa40'; -- Oldest (2025-09-24)
UPDATE transactions SET id = 'TXN-A000012' WHERE id = 'pzplle4lyhgmfyiwaby'; -- Second (2025-09-24)
UPDATE transactions SET id = 'TXN-A000013' WHERE id = 'ajcmgpwlvikmgin212w'; -- Third (2025-10-08)
UPDATE transactions SET id = 'TXN-A000014' WHERE id = '8kqsyd58bmmginj4ps'; -- Fourth (2025-10-09)
UPDATE transactions SET id = 'TXN-A000015' WHERE id = 'nyenjnd7c5mginj657'; -- Fifth (2025-10-09)

-- Update audit log references:
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
*/

-- ========================================
-- FINAL VERIFICATION
-- ========================================

-- All transactions should now have proper format
SELECT 
  id,
  created_by,
  amount,
  status,
  created_at
FROM transactions
ORDER BY 
  -- Sort by TXN letter and number for proper sequential order
  CASE 
    WHEN id ~ '^TXN-[A-Z]\d{6}$' THEN 
      SUBSTRING(id FROM 5 FOR 1) || LPAD(SUBSTRING(id FROM 6)::TEXT, 6, '0')
    ELSE 
      'ZZZZZZ' -- Put invalid IDs at the end
  END;

-- Summary statistics
SELECT 
  created_by,
  CASE 
    WHEN id ~ '^TXN-[A-Z]\d{6}$' THEN 'Valid Format'
    ELSE 'Invalid Format'
  END as format_status,
  COUNT(*) as count
FROM transactions
GROUP BY created_by, format_status
ORDER BY created_by, format_status;

-- ========================================
-- IMPORTANT NOTES
-- ========================================
-- 1. This script uses your current highest TXN ID as a starting point
-- 2. Make sure to check what your highest manual TXN ID is before running
-- 3. Adjust current_letter and current_number in the DO block accordingly
-- 4. The script maintains chronological order (oldest gets lowest ID)
-- 5. All audit log references are also updated

-- ========================================
-- ROLLBACK PLAN (if something goes wrong)
-- ========================================
-- You can restore from the backup if needed:

/*
-- View the backup
SELECT * FROM old_transaction_ids_backup;

-- If you need to rollback (DON'T RUN unless needed):
UPDATE transactions t
SET id = b.old_id
FROM old_transaction_ids_backup b
WHERE t.resident_id = b.resident_id
  AND t.contract_id = b.contract_id
  AND t.amount = b.amount
  AND t.created_at = b.created_at;
*/

