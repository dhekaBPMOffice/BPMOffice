-- Cole este conteúdo no Supabase Dashboard → SQL Editor e clique em Run.
-- Isso permite que o middleware leia seu perfil após o login (corrige "conta pendente").

DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT
  USING (auth_user_id = auth.uid());
