# Scripts Supabase (Dashboard)

## Corrigir erro "infinite recursion" na aba Usuários (líder do escritório)

Se na área do líder do escritório a aba **Usuários** mostra:
`Erro ao carregar usuários: infinite recursion detected in policy for relation "profiles"`:

1. No Supabase: **SQL Editor** → **New query**.
2. Copie todo o conteúdo de `fix-rls-profiles-recursion.sql` e cole na query.
3. Clique em **Run**.

Depois disso, a lista de usuários deve carregar normalmente para o líder.

---

## Fazer login como Administrador Master

1. **Crie um usuário no Supabase** (se ainda não tiver):
   - Dashboard → **Authentication** → **Users** → **Add user** → preencha e-mail e senha.

2. **Execute o script no SQL Editor**:
   - Dashboard → **SQL Editor** → **New query**.
   - Copie todo o conteúdo de `setup-admin-master.sql` e cole na query.
   - Clique em **Run**.

3. O **primeiro usuário** (o mais antigo da lista em Authentication → Users) será definido como **admin_master** e poderá acessar `/admin` sem precisar trocar a senha.

4. No seu app (localhost), faça login com o e-mail e a senha desse usuário. Você será redirecionado para **/admin**.

---

**Se quiser que outro usuário seja o admin master** (não o primeiro da lista), depois de rodar o script execute no SQL Editor:

```sql
UPDATE public.profiles
SET role = 'admin_master', must_change_password = false, password_change_approved = true
WHERE email = 'seu-email@exemplo.com';
```

(substitua pelo e-mail desejado)
