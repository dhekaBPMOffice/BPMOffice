-- ============================================
-- Strategic Objective <> Process Links
-- ============================================

CREATE TABLE IF NOT EXISTS strategic_objective_process_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL REFERENCES strategic_objectives(id) ON DELETE CASCADE,
  process_local_id TEXT NOT NULL,
  process_macroprocesso TEXT NOT NULL,
  process_nivel1 TEXT,
  process_nivel2 TEXT,
  process_nivel3 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_strategic_objective_process_links_unique
  ON strategic_objective_process_links (office_id, objective_id, process_local_id);

CREATE INDEX IF NOT EXISTS idx_strategic_objective_process_links_office
  ON strategic_objective_process_links (office_id);

ALTER TABLE strategic_objective_process_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master_manage_objective_process_links"
  ON strategic_objective_process_links
  FOR ALL
  USING (is_admin_master());

CREATE POLICY "office_manage_objective_process_links"
  ON strategic_objective_process_links
  FOR ALL
  USING (office_id = my_office_id());

