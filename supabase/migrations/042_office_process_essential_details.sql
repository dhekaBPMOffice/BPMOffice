-- Campos complementares do Plano Essencial sem migrar ou sobrescrever dados legados.
ALTER TABLE office_processes
  ADD COLUMN IF NOT EXISTS essential_details JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN office_processes.essential_details IS
  'Dados cadastrais complementares exibidos no Plano Essencial de gestão de processos.';
