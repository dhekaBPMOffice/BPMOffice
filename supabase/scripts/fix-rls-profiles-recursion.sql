-- ============================================
-- Fix: recursão infinita na política RLS de "profiles"
-- ============================================
-- Cole este conteúdo no Supabase Dashboard → SQL Editor e clique em Run.
-- Corrige o erro "infinite recursion detected in policy for relation profiles"
-- na aba Escritório → Usuários quando o líder carrega a lista.
-- ============================================

CREATE OR REPLACE FUNCTION my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

DROP POLICY IF EXISTS "leaders_manage_office_profiles" ON profiles;
CREATE POLICY "leaders_manage_office_profiles" ON profiles FOR ALL
  USING (office_id = my_office_id() AND my_role() = 'leader');

DROP POLICY IF EXISTS "leader_manage_own_branding" ON branding;
CREATE POLICY "leader_manage_own_branding" ON branding FOR ALL
  USING (office_id = my_office_id() AND my_role() = 'leader');

DROP POLICY IF EXISTS "leader_manage_own_office_config" ON office_config;
CREATE POLICY "leader_manage_own_office_config" ON office_config FOR ALL
  USING (office_id = my_office_id() AND my_role() = 'leader');
