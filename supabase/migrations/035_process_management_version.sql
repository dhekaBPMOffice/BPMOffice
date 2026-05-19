-- Versão da experiência de gestão de processos por plano.

UPDATE plans
SET features = features || jsonb_build_object(
  'process_management_version',
  COALESCE(NULLIF(features->>'process_management_version', ''), 'complete')
);
