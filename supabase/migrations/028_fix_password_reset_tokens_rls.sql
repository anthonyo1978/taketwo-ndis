-- Fix RLS policy for password_reset_tokens table
-- The service role needs to be able to insert tokens

-- Drop the existing policy
DROP POLICY IF EXISTS "Service role can manage reset tokens" ON password_reset_tokens;

-- Create more permissive policies for authenticated operations
-- Allow server-side operations (using service role or anon key with proper auth)
CREATE POLICY "Allow server to insert reset tokens"
  ON password_reset_tokens
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow server to read reset tokens"
  ON password_reset_tokens
  FOR SELECT
  USING (true);

CREATE POLICY "Allow server to update reset tokens"
  ON password_reset_tokens
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow server to delete reset tokens"
  ON password_reset_tokens
  FOR DELETE
  USING (true);

