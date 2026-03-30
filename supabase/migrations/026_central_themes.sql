-- ============================================
-- Temas centrais (lista suspensa) para objetivos base do escritório
-- ============================================

CREATE TABLE central_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_central_themes_name_lower ON central_themes (lower(trim(name)));

ALTER TABLE base_office_objectives
  ADD COLUMN central_theme_id UUID REFERENCES central_themes(id) ON DELETE RESTRICT;

CREATE INDEX idx_base_office_objectives_central_theme ON base_office_objectives(central_theme_id);

-- Migrar descrições existentes para temas e vincular
INSERT INTO central_themes (name)
SELECT DISTINCT trim(bo.description)
FROM base_office_objectives bo
WHERE bo.description IS NOT NULL AND trim(bo.description) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM central_themes t
    WHERE lower(trim(t.name)) = lower(trim(bo.description))
  );

UPDATE base_office_objectives bo
SET central_theme_id = ct.id
FROM central_themes ct
WHERE bo.description IS NOT NULL
  AND trim(bo.description) <> ''
  AND lower(trim(bo.description)) = lower(trim(ct.name));

ALTER TABLE base_office_objectives DROP COLUMN description;

-- RLS
ALTER TABLE central_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master_central_themes" ON central_themes FOR ALL
  USING (is_admin_master());

CREATE POLICY "office_read_central_themes" ON central_themes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM base_office_objectives b
      WHERE b.central_theme_id = central_themes.id AND b.is_active = true
    )
  );

CREATE TRIGGER update_central_themes_updated_at
  BEFORE UPDATE ON central_themes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE central_themes IS 'Itens da lista suspensa Tema Central nos objetivos base do escritório.';
COMMENT ON COLUMN base_office_objectives.central_theme_id IS 'Tema central (cadastro em central_themes).';
