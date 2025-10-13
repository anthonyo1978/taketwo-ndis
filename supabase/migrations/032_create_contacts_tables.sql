-- ============================================================================
-- CREATE CONTACTS TABLES FOR RESIDENT CONTACT LIST
-- ============================================================================

-- Create contacts table for storing contact information
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,  -- Free text, user-defined (e.g., 'Doctor', 'Family', 'Support Coordinator')
  phone TEXT,
  email TEXT,
  description TEXT,  -- Short description (e.g., 'Local GP', 'Brother')
  note TEXT,  -- Multi-line notes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create join table for resident-contact relationships
CREATE TABLE IF NOT EXISTS resident_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resident_id, contact_id)  -- Prevent duplicate links
);

-- Indexes for fast queries
CREATE INDEX idx_contacts_name ON contacts(name);
CREATE INDEX idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX idx_contacts_phone ON contacts(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_resident_contacts_resident_id ON resident_contacts(resident_id);
CREATE INDEX idx_resident_contacts_contact_id ON resident_contacts(contact_id);

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE resident_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contacts
CREATE POLICY "Allow authenticated users to read contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow server to manage contacts"
  ON contacts FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for resident_contacts
CREATE POLICY "Allow authenticated users to read resident_contacts"
  ON resident_contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow server to manage resident_contacts"
  ON resident_contacts FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to get contact count for a contact (how many residents it's linked to)
CREATE OR REPLACE FUNCTION get_contact_resident_count(contact_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM resident_contacts
  WHERE contact_id = contact_uuid;
$$;

-- Function to update updated_at timestamp on contacts
CREATE OR REPLACE FUNCTION update_contact_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_updated_at();

-- Add comments
COMMENT ON TABLE contacts IS 'Stores contact information for residents (doctors, family, support coordinators, etc.)';
COMMENT ON TABLE resident_contacts IS 'Many-to-many relationship between residents and their contacts';
COMMENT ON COLUMN contacts.role IS 'Free text role (e.g., Doctor, Family, Support Coordinator, GP, etc.)';
COMMENT ON COLUMN contacts.description IS 'Short description like "Local GP" or "Brother"';
COMMENT ON COLUMN contacts.note IS 'Multi-line notes about the contact';

