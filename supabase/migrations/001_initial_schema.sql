-- ============================================
-- BPM Office SaaS — Initial Schema (Stage 1)
-- ============================================

-- Plans (commercial tiers)
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  max_users INTEGER NOT NULL DEFAULT 5,
  max_processes INTEGER NOT NULL DEFAULT 50,
  features JSONB NOT NULL DEFAULT '{}',
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Offices (tenants)
CREATE TABLE offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_offices_slug ON offices(slug);

-- Custom roles per office
CREATE TABLE custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(office_id, name)
);

-- Role permissions
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(role_id, resource)
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  office_id UUID REFERENCES offices(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('admin_master', 'leader', 'user')) DEFAULT 'user',
  custom_role_id UUID REFERENCES custom_roles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT,
  job_title TEXT,
  avatar_url TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  password_change_approved BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  first_login_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_office ON profiles(office_id);
CREATE INDEX idx_profiles_auth ON profiles(auth_user_id);

-- Branding (identity per office; null office_id = platform default)
CREATE TABLE branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID UNIQUE REFERENCES offices(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1d4ed8',
  secondary_color TEXT NOT NULL DEFAULT '#f1f5f9',
  accent_color TEXT NOT NULL DEFAULT '#3b82f6',
  cover_url TEXT,
  header_html TEXT,
  footer_html TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID REFERENCES offices(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_office ON audit_log(office_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ============================================
-- Row Level Security Policies
-- ============================================

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's profile
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS profiles AS $$
  SELECT * FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: check if current user is admin master
CREATE OR REPLACE FUNCTION is_admin_master()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE auth_user_id = auth.uid() AND role = 'admin_master'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: get current user's office_id
CREATE OR REPLACE FUNCTION my_office_id()
RETURNS UUID AS $$
  SELECT office_id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Plans: admin can do everything, others can read active plans
CREATE POLICY "admin_master_all_plans" ON plans FOR ALL
  USING (is_admin_master());

CREATE POLICY "read_active_plans" ON plans FOR SELECT
  USING (is_active = true);

-- Offices: admin can do everything, members can read their own
CREATE POLICY "admin_master_all_offices" ON offices FOR ALL
  USING (is_admin_master());

CREATE POLICY "members_read_own_office" ON offices FOR SELECT
  USING (id = my_office_id());

-- Custom roles: admin can read all, office members can read their own
CREATE POLICY "admin_read_all_roles" ON custom_roles FOR SELECT
  USING (is_admin_master());

CREATE POLICY "office_manage_roles" ON custom_roles FOR ALL
  USING (office_id = my_office_id());

-- Role permissions: follow custom_roles access
CREATE POLICY "admin_read_all_perms" ON role_permissions FOR SELECT
  USING (is_admin_master());

CREATE POLICY "office_manage_perms" ON role_permissions FOR ALL
  USING (
    role_id IN (SELECT id FROM custom_roles WHERE office_id = my_office_id())
  );

-- Profiles: admin can read all, users see own office
CREATE POLICY "admin_master_all_profiles" ON profiles FOR ALL
  USING (is_admin_master());

CREATE POLICY "users_read_own_office_profiles" ON profiles FOR SELECT
  USING (office_id = my_office_id());

CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Leaders can manage profiles in their office
CREATE POLICY "leaders_manage_office_profiles" ON profiles FOR ALL
  USING (
    office_id = my_office_id()
    AND (SELECT role FROM profiles WHERE auth_user_id = auth.uid()) = 'leader'
  );

-- Branding: admin manages all, office members read their own
CREATE POLICY "admin_master_all_branding" ON branding FOR ALL
  USING (is_admin_master());

CREATE POLICY "office_read_own_branding" ON branding FOR SELECT
  USING (office_id = my_office_id() OR is_default = true);

CREATE POLICY "leader_manage_own_branding" ON branding FOR ALL
  USING (
    office_id = my_office_id()
    AND (SELECT role FROM profiles WHERE auth_user_id = auth.uid()) = 'leader'
  );

-- Audit log: admin sees all, office sees own
CREATE POLICY "admin_read_all_audit" ON audit_log FOR SELECT
  USING (is_admin_master());

CREATE POLICY "office_read_own_audit" ON audit_log FOR SELECT
  USING (office_id = my_office_id());

CREATE POLICY "insert_audit" ON audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Updated_at trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_offices_updated_at
  BEFORE UPDATE ON offices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branding_updated_at
  BEFORE UPDATE ON branding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
