-- Perfil padrão do sistema por escritório (não editável na UI)
ALTER TABLE custom_roles
  ADD COLUMN IF NOT EXISTS is_system_default BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS custom_roles_one_system_default_per_office
  ON custom_roles (office_id)
  WHERE is_system_default = true;
