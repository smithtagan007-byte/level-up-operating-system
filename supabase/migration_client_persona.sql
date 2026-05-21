-- Client persona: add profile columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS headcount INTEGER;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS relationship_health TEXT CHECK (relationship_health IN ('strong', 'good', 'at_risk', 'dormant'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS relationship_notes TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS culture_notes TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS hiring_preferences TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS fee_percentage NUMERIC(5,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS warranty_period_days INTEGER;

-- Key contacts table
CREATE TABLE IF NOT EXISTS client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id);
