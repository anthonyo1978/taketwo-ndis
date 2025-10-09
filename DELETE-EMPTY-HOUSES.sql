-- ============================================================================
-- DELETE HOUSES WITH NO RESIDENTS
-- Safe script with preview and confirmation steps
-- ============================================================================

-- ============================================================================
-- STEP 1: PREVIEW - See which houses will be deleted
-- ============================================================================

-- Run this first to see what will be deleted
SELECT 
  h.id,
  h.descriptor,
  h.address1,
  h.suburb,
  h.state,
  h.status,
  (SELECT COUNT(*) FROM residents WHERE house_id = h.id) as resident_count
FROM houses h
WHERE NOT EXISTS (
  SELECT 1 FROM residents r WHERE r.house_id = h.id
)
ORDER BY h.created_at DESC;

-- ============================================================================
-- STEP 2: COUNT - How many houses will be deleted?
-- ============================================================================

SELECT COUNT(*) as houses_to_delete
FROM houses h
WHERE NOT EXISTS (
  SELECT 1 FROM residents r WHERE r.house_id = h.id
);

-- ============================================================================
-- STEP 3: DELETE - Run this to actually delete empty houses
-- ============================================================================

-- CAUTION: This will permanently delete houses with no residents!
-- Make sure you've reviewed the preview above first.

DELETE FROM houses
WHERE id IN (
  SELECT h.id
  FROM houses h
  WHERE NOT EXISTS (
    SELECT 1 FROM residents r WHERE r.house_id = h.id
  )
)
RETURNING id, descriptor, address1;

-- ============================================================================
-- STEP 4: VERIFY - Check deletion was successful
-- ============================================================================

-- Count remaining houses
SELECT 
  COUNT(*) as total_houses,
  COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM residents WHERE house_id = houses.id)) as houses_with_residents,
  COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM residents WHERE house_id = houses.id)) as houses_without_residents
FROM houses;

-- ============================================================================
-- ALTERNATIVE: Delete only specific status houses
-- ============================================================================

-- If you want to delete only Vacant houses with no residents:
/*
DELETE FROM houses
WHERE status = 'Vacant'
AND NOT EXISTS (
  SELECT 1 FROM residents r WHERE r.house_id = houses.id
)
RETURNING id, descriptor, address1;
*/

-- ============================================================================
-- ROLLBACK PLAN (If you made a mistake)
-- ============================================================================

-- Unfortunately, once deleted, data cannot be recovered unless you have:
-- 1. A database backup
-- 2. Point-in-time recovery enabled in Supabase

-- To prevent accidents, you could:
-- 1. Export houses to CSV first
-- 2. Soft delete (set status = 'Deleted' instead of DELETE)

-- Soft delete alternative:
/*
UPDATE houses
SET status = 'Deleted', updated_at = NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM residents r WHERE r.house_id = houses.id
)
RETURNING id, descriptor;
*/

-- ============================================================================
-- NOTES
-- ============================================================================
-- This script is safe because:
-- 1. Preview step shows what will be deleted
-- 2. Count step shows how many
-- 3. RETURNING clause shows what was actually deleted
-- 4. Verify step confirms the result

-- Run steps in order:
-- 1. Preview (see the list)
-- 2. Count (confirm number)
-- 3. Delete (if you're sure)
-- 4. Verify (check result)

