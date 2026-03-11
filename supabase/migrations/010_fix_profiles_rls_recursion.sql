-- ============================================
-- Fix: infinite recursion in RLS policies for profiles
-- ============================================
-- Policies that used (SELECT role FROM profiles WHERE auth_user_id = auth.uid())
-- trigger RLS again on profiles, causing infinite recursion.
-- Solution: my_role() SECURITY DEFINER reads profiles without RLS.
-- ============================================

CREATE OR REPLACE FUNCTION my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles: leader manages office profiles (no inline subquery on profiles)
DROP POLICY IF EXISTS "leaders_manage_office_profiles" ON profiles;
CREATE POLICY "leaders_manage_office_profiles" ON profiles FOR ALL
  USING (office_id = my_office_id() AND my_role() = 'leader');

-- Branding: leader manages own office branding
DROP POLICY IF EXISTS "leader_manage_own_branding" ON branding;
CREATE POLICY "leader_manage_own_branding" ON branding FOR ALL
  USING (office_id = my_office_id() AND my_role() = 'leader');

-- Office config: leader manages own office config
DROP POLICY IF EXISTS "leader_manage_own_office_config" ON office_config;
CREATE POLICY "leader_manage_own_office_config" ON office_config FOR ALL
  USING (office_id = my_office_id() AND my_role() = 'leader');
