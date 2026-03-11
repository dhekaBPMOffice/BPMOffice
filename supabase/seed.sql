-- ============================================
-- Seed: Default plan + default branding
-- ============================================

-- Default free plan
INSERT INTO plans (name, description, max_users, max_processes, features, price_monthly, is_active)
VALUES (
  'Básico',
  'Plano inicial com funcionalidades essenciais',
  5,
  20,
  '{"value_chain": true, "swot": true, "portfolio": true, "bpm_cycle": true, "ai": false, "knowledge_management": false, "training": false}',
  0,
  true
);

INSERT INTO plans (name, description, max_users, max_processes, features, price_monthly, is_active)
VALUES (
  'Profissional',
  'Para escritórios em crescimento com IA e gestão completa',
  20,
  100,
  '{"value_chain": true, "swot": true, "portfolio": true, "bpm_cycle": true, "ai": true, "knowledge_management": true, "training": true}',
  199.90,
  true
);

INSERT INTO plans (name, description, max_users, max_processes, features, price_monthly, is_active)
VALUES (
  'Enterprise',
  'Escritórios de grande porte com recursos ilimitados',
  999,
  9999,
  '{"value_chain": true, "swot": true, "portfolio": true, "bpm_cycle": true, "ai": true, "knowledge_management": true, "training": true, "custom_ai_api": true, "backup_auto": true}',
  499.90,
  true
);

-- Default platform branding
INSERT INTO branding (office_id, primary_color, secondary_color, accent_color, is_default)
VALUES (NULL, '#0097a7', '#7b1fa2', '#c2185b', true);

-- NOTE: The Admin Master user must be created through Supabase Auth UI or API.
-- After creating the auth user, insert a profile:
--
-- INSERT INTO profiles (auth_user_id, office_id, role, full_name, email, must_change_password)
-- VALUES ('<AUTH_USER_UUID>', NULL, 'admin_master', 'Administrador Master', 'admin@bpmoffice.com', false);
