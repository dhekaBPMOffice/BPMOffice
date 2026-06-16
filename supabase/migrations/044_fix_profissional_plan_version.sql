-- Corrige o plano "Profissional" que ficou com process_management_version: "complete"
-- após o backfill padrão da migration 035.
-- Só atualiza planos cujo valor ainda é "complete" por default — não sobrescreve
-- configurações definidas manualmente no admin.
UPDATE plans
SET features = features || '{"process_management_version": "professional"}'
WHERE name = 'Profissional'
  AND (features->>'process_management_version' = 'complete'
       OR features->>'process_management_version' IS NULL);

-- Garante que o plano "Básico" use a experiência Essencial.
UPDATE plans
SET features = features || '{"process_management_version": "essential"}'
WHERE name = 'Básico'
  AND (features->>'process_management_version' = 'complete'
       OR features->>'process_management_version' IS NULL);
