-- Add origin and source_file to strategic_objectives for Objetivos Estratégicos page
ALTER TABLE strategic_objectives
  ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'manual' CHECK (origin IN ('manual', 'imported')),
  ADD COLUMN IF NOT EXISTS source_file TEXT;

COMMENT ON COLUMN strategic_objectives.origin IS 'manual = cadastrado manualmente; imported = importado de documento';
COMMENT ON COLUMN strategic_objectives.source_file IS 'Nome do arquivo de origem quando origin = imported';
