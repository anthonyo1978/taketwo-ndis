-- Create residents table
CREATE TABLE residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID REFERENCES houses(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Non-binary', 'Prefer not to say')),
  phone TEXT,
  email TEXT,
  ndis_id TEXT,
  photo_base64 TEXT,
  notes TEXT,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Active', 'Deactivated')),
  detailed_notes TEXT,
  preferences JSONB,
  emergency_contact JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT DEFAULT 'system',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT DEFAULT 'system'
);

-- Create funding contracts table (separate from residents for better normalization)
CREATE TABLE funding_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES residents(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('NDIS', 'Government', 'Private', 'Family', 'Other')),
  amount DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  contract_status TEXT DEFAULT 'Draft' CHECK (contract_status IN ('Draft', 'Active', 'Expired', 'Cancelled', 'Renewed')),
  original_amount DECIMAL(10,2) NOT NULL,
  current_balance DECIMAL(10,2) NOT NULL,
  drawdown_rate TEXT DEFAULT 'monthly' CHECK (drawdown_rate IN ('daily', 'weekly', 'monthly')),
  auto_drawdown BOOLEAN DEFAULT true,
  last_drawdown_date DATE,
  renewal_date DATE,
  parent_contract_id UUID REFERENCES funding_contracts(id),
  support_item_code TEXT,
  daily_support_item_cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit trail table
CREATE TABLE resident_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES residents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_residents_house_id ON residents(house_id);
CREATE INDEX idx_residents_status ON residents(status);
CREATE INDEX idx_residents_created_at ON residents(created_at);
CREATE INDEX idx_funding_contracts_resident_id ON funding_contracts(resident_id);
CREATE INDEX idx_funding_contracts_type ON funding_contracts(type);
CREATE INDEX idx_audit_trail_resident_id ON resident_audit_trail(resident_id);

-- Enable Row Level Security
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE resident_audit_trail ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Allow all operations on residents" ON residents FOR ALL USING (true);
CREATE POLICY "Allow all operations on funding_contracts" ON funding_contracts FOR ALL USING (true);
CREATE POLICY "Allow all operations on resident_audit_trail" ON resident_audit_trail FOR ALL USING (true);

-- Add comments
COMMENT ON TABLE residents IS 'NDIS participants and residents';
COMMENT ON TABLE funding_contracts IS 'Funding contracts and agreements for residents';
COMMENT ON TABLE resident_audit_trail IS 'Audit trail for resident changes';
