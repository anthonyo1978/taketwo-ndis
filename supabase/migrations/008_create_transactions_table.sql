-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES funding_contracts(id) ON DELETE CASCADE,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  service_code TEXT,
  service_item_code TEXT,
  description TEXT,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'voided')),
  drawdown_status TEXT CHECK (drawdown_status IN ('pending', 'validated', 'posted', 'rejected', 'voided')),
  note TEXT,
  support_agreement_id TEXT,
  is_drawdown_transaction BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT NOT NULL,
  posted_at TIMESTAMP WITH TIME ZONE,
  posted_by TEXT,
  voided_at TIMESTAMP WITH TIME ZONE,
  voided_by TEXT,
  void_reason TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_resident_id ON transactions(resident_id);
CREATE INDEX IF NOT EXISTS idx_transactions_contract_id ON transactions(contract_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_occurred_at ON transactions(occurred_at);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Foreign key constraint to funding_contracts is already defined in the table creation above

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transactions_updated_at 
  BEFORE UPDATE ON transactions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
