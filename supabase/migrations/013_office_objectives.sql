-- ============================================
-- BPM Office SaaS — Office Objectives (Objetivos do Escritório)
-- ============================================

-- Catalog of objective options (admin master)
CREATE TABLE base_office_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_base_office_objectives_active ON base_office_objectives(is_active) WHERE is_active = true;

-- Office objectives (per office)
CREATE TABLE office_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  base_objective_id UUID REFERENCES base_office_objectives(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'secondary' CHECK (type IN ('primary', 'secondary')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  origin TEXT NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual', 'imported', 'catalog')),
  source_file TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_office_objectives_office ON office_objectives(office_id);
CREATE INDEX idx_office_objectives_type ON office_objectives(office_id, type);
CREATE INDEX idx_office_objectives_sort ON office_objectives(office_id, sort_order);

-- Goals (metas) for each office objective
CREATE TABLE office_objective_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_objective_id UUID NOT NULL REFERENCES office_objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_office_objective_goals_objective ON office_objective_goals(office_objective_id);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE base_office_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_objective_goals ENABLE ROW LEVEL SECURITY;

-- base_office_objectives: admin full access; offices read active only
CREATE POLICY "admin_master_base_office_objectives" ON base_office_objectives FOR ALL
  USING (is_admin_master());

CREATE POLICY "office_read_base_office_objectives" ON base_office_objectives FOR SELECT
  USING (is_active = true);

-- office_objectives: admin full; office manage own
CREATE POLICY "admin_master_office_objectives" ON office_objectives FOR ALL
  USING (is_admin_master());

CREATE POLICY "office_manage_office_objectives" ON office_objectives FOR ALL
  USING (office_id = my_office_id());

-- office_objective_goals: admin full; office manage when objective belongs to office
CREATE POLICY "admin_master_office_objective_goals" ON office_objective_goals FOR ALL
  USING (is_admin_master());

CREATE POLICY "office_manage_office_objective_goals" ON office_objective_goals FOR ALL
  USING (
    office_objective_id IN (
      SELECT id FROM office_objectives WHERE office_id = my_office_id()
    )
  );

-- ============================================
-- Updated_at triggers
-- ============================================

CREATE TRIGGER update_base_office_objectives_updated_at
  BEFORE UPDATE ON base_office_objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_office_objectives_updated_at
  BEFORE UPDATE ON office_objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
