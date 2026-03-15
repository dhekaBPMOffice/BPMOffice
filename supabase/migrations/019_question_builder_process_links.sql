-- ============================================
-- BPM Office SaaS — Question Builder Refinement
-- ============================================

ALTER TABLE process_questionnaire_questions
  ADD COLUMN enable_process_linking BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE process_questionnaire_options
  ADD COLUMN enable_process_linking BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE process_questionnaire_question_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES process_questionnaire_questions(id) ON DELETE CASCADE,
  base_process_id UUID NOT NULL REFERENCES base_processes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, base_process_id)
);

CREATE INDEX idx_process_questionnaire_question_processes_question
  ON process_questionnaire_question_processes(question_id);

ALTER TABLE process_questionnaire_question_processes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master_process_questionnaire_question_processes"
  ON process_questionnaire_question_processes FOR ALL
  USING (is_admin_master());

CREATE POLICY "office_read_questionnaire_question_processes"
  ON process_questionnaire_question_processes FOR SELECT
  USING (true);
