-- Allow form questions to be deleted while preserving submitted demand history.

ALTER TABLE demand_form_answers
  DROP CONSTRAINT IF EXISTS demand_form_answers_question_id_fkey;

ALTER TABLE demand_form_answers
  ALTER COLUMN question_id DROP NOT NULL;

ALTER TABLE demand_form_answers
  ADD CONSTRAINT demand_form_answers_question_id_fkey
  FOREIGN KEY (question_id)
  REFERENCES office_demand_form_questions(id)
  ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
