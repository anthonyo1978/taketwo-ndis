-- Update transactions table to use TEXT ID instead of UUID
-- This allows for custom TXN prefixed IDs

-- First, drop the existing primary key constraint
ALTER TABLE transactions DROP CONSTRAINT transactions_pkey;

-- Change the id column from UUID to TEXT
ALTER TABLE transactions ALTER COLUMN id TYPE TEXT;

-- Add the primary key constraint back
ALTER TABLE transactions ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);

-- Update the foreign key constraints to handle TEXT IDs
-- (These should still work as they reference other tables' UUID columns)
