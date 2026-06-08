-- Campos complementares do Plano Profissional sem migrar ou sobrescrever dados legados.
ALTER TABLE office_processes
  ADD COLUMN IF NOT EXISTS professional_details JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN office_processes.professional_details IS
  'Dados de levantamento, problemas, oportunidades, ações e acompanhamento exibidos no Plano Profissional de gestão de processos.';
