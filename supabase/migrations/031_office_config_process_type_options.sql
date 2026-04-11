-- Tipos de processo configuráveis por escritório (lista para dropdown).

ALTER TABLE office_config
  ADD COLUMN IF NOT EXISTS process_type_options TEXT[] NOT NULL
  DEFAULT ARRAY['Gestão', 'Negócio', 'Suporte']::TEXT[];

COMMENT ON COLUMN office_config.process_type_options IS
  'Rótulos do campo Tipo nos processos (ordem = ordem no dropdown).';
