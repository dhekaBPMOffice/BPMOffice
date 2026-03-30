-- Flatten office objectives: remove parent/secondary hierarchy; top-level rows use type primary.

UPDATE office_objectives
SET parent_objective_id = NULL,
    type = 'primary'
WHERE parent_objective_id IS NOT NULL;

UPDATE office_objectives
SET type = 'primary'
WHERE parent_objective_id IS NULL
  AND type = 'secondary';

COMMENT ON COLUMN office_objectives.parent_objective_id IS 'Legacy; app no longer creates child objectives.';
