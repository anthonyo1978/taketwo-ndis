-- ============================================================================
-- DIAGNOSTIC QUERY - User Invite Issue
-- ============================================================================
-- Run this in Supabase SQL Editor to diagnose the problem
-- This uses service role (bypasses RLS) to see what's actually in the database
-- ============================================================================

-- 1. Check the invited user record
SELECT 
  id,
  first_name,
  last_name,
  email,
  auth_user_id,
  organization_id,
  status,
  role,
  created_at,
  invited_at,
  activated_at
FROM users
WHERE email = 'YOUR_EMAIL_HERE' -- REPLACE WITH YOUR EMAIL
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if auth user exists in Supabase Auth
-- (This will show if the password setup created the auth record)
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE' -- REPLACE WITH YOUR EMAIL
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check current RLS policies on users table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- 4. Check current RLS policies on user_invites table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_invites'
ORDER BY policyname;

-- 5. Check if organization exists
SELECT 
  id,
  name,
  slug,
  created_at
FROM organizations
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- Query 1 (users):
--   - Should show your user record
--   - auth_user_id should NOT be null
--   - organization_id should NOT be null
--   - status should be 'active'
--
-- Query 2 (auth.users):
--   - Should show Supabase Auth record with same email
--   - email_confirmed_at should NOT be null
--
-- Query 3 (users RLS policies):
--   - Should include "Users can read their own record" policy
--
-- Query 4 (user_invites RLS policies):
--   - Should include "Anonymous users can validate invite tokens" policy
--
-- Query 5 (organizations):
--   - Should show at least one organization
-- ============================================================================


