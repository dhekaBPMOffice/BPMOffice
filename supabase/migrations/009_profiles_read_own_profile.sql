-- Permite que todo usuário autenticado leia o próprio perfil.
-- Necessário para o middleware conseguir carregar o perfil após o login
-- (usuários com office_id null não batem na política users_read_own_office_profiles).
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT
  USING (auth_user_id = auth.uid());
