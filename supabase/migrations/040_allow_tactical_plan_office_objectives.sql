-- Allow tactical plan actions to be linked primarily to office objectives.
-- Legacy strategic objective links remain available through objective_id.

ALTER TABLE tactical_plans
  ALTER COLUMN objective_id DROP NOT NULL;
