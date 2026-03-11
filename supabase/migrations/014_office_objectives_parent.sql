-- Add parent_objective_id to link secondary objectives to primary
ALTER TABLE office_objectives
  ADD COLUMN IF NOT EXISTS parent_objective_id UUID REFERENCES office_objectives(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_office_objectives_parent ON office_objectives(parent_objective_id);

COMMENT ON COLUMN office_objectives.parent_objective_id IS 'When set, this objective is secondary and linked to this primary objective.';
