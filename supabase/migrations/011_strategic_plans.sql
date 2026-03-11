-- ============================================
-- BPM Office SaaS — Strategic Plans & Versioning
-- ============================================

-- Master table for strategic plans
CREATE TABLE strategic_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  mission TEXT,
  vision TEXT,
  values_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_strategic_plans_office ON strategic_plans(office_id);
CREATE INDEX idx_strategic_plans_status ON strategic_plans(office_id, status);

-- Snapshots for version history
CREATE TABLE strategic_plan_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES strategic_plans(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  snapshot_data JSONB NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_strategic_plan_snapshots_plan ON strategic_plan_snapshots(plan_id);
CREATE INDEX idx_strategic_plan_snapshots_office ON strategic_plan_snapshots(office_id);

-- Link existing tables to strategic plans
ALTER TABLE swot_items
  ADD COLUMN plan_id UUID REFERENCES strategic_plans(id) ON DELETE CASCADE;

ALTER TABLE strategic_objectives
  ADD COLUMN plan_id UUID REFERENCES strategic_plans(id) ON DELETE CASCADE;

CREATE INDEX idx_swot_items_plan ON swot_items(plan_id);
CREATE INDEX idx_strategic_objectives_plan ON strategic_objectives(plan_id);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE strategic_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_plan_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master_strategic_plans" ON strategic_plans FOR ALL
  USING (is_admin_master());
CREATE POLICY "office_manage_strategic_plans" ON strategic_plans FOR ALL
  USING (office_id = my_office_id());

CREATE POLICY "admin_master_strategic_plan_snapshots" ON strategic_plan_snapshots FOR ALL
  USING (is_admin_master());
CREATE POLICY "office_manage_strategic_plan_snapshots" ON strategic_plan_snapshots FOR ALL
  USING (office_id = my_office_id());

-- ============================================
-- Updated_at trigger
-- ============================================

CREATE TRIGGER update_strategic_plans_updated_at
  BEFORE UPDATE ON strategic_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
