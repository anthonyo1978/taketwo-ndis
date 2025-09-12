-- Create houses table
CREATE TABLE houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address1 TEXT NOT NULL,
  address2 TEXT,
  suburb TEXT NOT NULL,
  state TEXT NOT NULL,
  postcode TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_houses_created_at ON houses(created_at);

-- Enable Row Level Security
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policy (allow all for now, we'll refine later)
CREATE POLICY "Allow all operations on houses" ON houses
  FOR ALL USING (true);

-- Add comment
COMMENT ON TABLE houses IS 'NDIS supported accommodation houses';
