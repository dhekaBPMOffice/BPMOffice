-- ============================================
-- BPM Office SaaS — Generic Forms Module
-- ============================================

-- Add form-level flags to process_questionnaires (treated as generic "forms")
ALTER TABLE process_questionnaires
  ADD COLUMN enable_process_linking BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE process_questionnaires
  ADD COLUMN is_process_activation_form BOOLEAN NOT NULL DEFAULT false;

-- Ensure only one activation form; existing active questionnaire becomes activation form
CREATE UNIQUE INDEX idx_process_questionnaires_single_activation
  ON process_questionnaires(is_process_activation_form)
  WHERE is_process_activation_form = true;

UPDATE process_questionnaires
SET is_process_activation_form = true, enable_process_linking = true
WHERE is_active = true;

-- Extend question_type to support short_text, long_text (Google Forms-like)
ALTER TABLE process_questionnaire_questions
  DROP CONSTRAINT IF EXISTS process_questionnaire_questions_question_type_check;

ALTER TABLE process_questionnaire_questions
  ADD CONSTRAINT process_questionnaire_questions_question_type_check
  CHECK (question_type IN ('text', 'short_text', 'long_text', 'single_select', 'multi_select'));
