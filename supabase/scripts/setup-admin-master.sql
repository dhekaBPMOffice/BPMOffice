-- ============================================
-- Executar no Supabase Dashboard > SQL Editor
-- Cria perfis para usuários de autenticação e define
-- o primeiro usuário como Administrador Master.
-- ============================================

-- 1) Função que cria perfil ao criar usuário no Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    auth_user_id,
    full_name,
    email,
    role,
    must_change_password,
    password_change_approved
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    'user',
    true,
    false
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2) Trigger em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3) Criar perfil para todos os usuários que já existem no Auth e ainda não têm perfil
INSERT INTO public.profiles (auth_user_id, full_name, email, role, must_change_password, password_change_approved)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
  email,
  'user',
  true,
  false
FROM auth.users
ON CONFLICT (auth_user_id) DO NOTHING;

-- 4) Definir o primeiro usuário (mais antigo) como Administrador Master e liberar acesso sem troca de senha
UPDATE public.profiles
SET
  role = 'admin_master',
  must_change_password = false,
  password_change_approved = true
WHERE auth_user_id = (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
);
