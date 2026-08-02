-- Cadastro estruturado da empresa (tenant) para estratégia e IA

CREATE TABLE office_company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL UNIQUE REFERENCES offices(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT '',
  website_url TEXT,
  main_industry TEXT,
  business_models TEXT[] NOT NULL DEFAULT '{}',
  company_size TEXT CHECK (
    company_size IS NULL OR company_size IN ('micro', 'small', 'medium', 'large', 'unknown')
  ),
  employee_count INTEGER,
  units_count INTEGER,
  revenue_note TEXT,
  operation_scopes TEXT[] NOT NULL DEFAULT '{}',
  scope_locations TEXT,
  products_services TEXT,
  customer_types TEXT[] NOT NULL DEFAULT '{}',
  customers_description TEXT,
  has_business_units TEXT CHECK (
    has_business_units IS NULL OR has_business_units IN ('yes', 'no', 'unknown')
  ),
  business_units_detail TEXT,
  mission TEXT,
  has_regulation TEXT CHECK (
    has_regulation IS NULL OR has_regulation IN ('yes', 'no', 'unknown')
  ),
  regulation_detail TEXT,
  other_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_office_company_profiles_office ON office_company_profiles(office_id);

ALTER TABLE office_company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master_office_company_profiles" ON office_company_profiles FOR ALL
  USING (is_admin_master());

CREATE POLICY "office_manage_office_company_profiles" ON office_company_profiles FOR ALL
  USING (office_id = my_office_id());

CREATE TRIGGER update_office_company_profiles_updated_at
  BEFORE UPDATE ON office_company_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
