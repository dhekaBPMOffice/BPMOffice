-- ============================================
-- BPM Office SaaS — Form Sections / Steps
-- ============================================

CREATE TABLE process_questionnaire_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES process_questionnaires(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_process_questionnaire_sections_order
  ON process_questionnaire_sections(questionnaire_id, sort_order);

ALTER TABLE process_questionnaire_questions
  ADD COLUMN section_id UUID REFERENCES process_questionnaire_sections(id) ON DELETE CASCADE;

INSERT INTO process_questionnaire_sections (
  questionnaire_id,
  title,
  subtitle,
  description,
  sort_order
)
SELECT
  id,
  'Etapa 1',
  NULL,
  description,
  0
FROM process_questionnaires;

UPDATE process_questionnaire_questions AS question
SET section_id = section.id
FROM process_questionnaire_sections AS section
WHERE section.questionnaire_id = question.questionnaire_id
  AND section.sort_order = 0
  AND question.section_id IS NULL;

ALTER TABLE process_questionnaire_questions
  ALTER COLUMN section_id SET NOT NULL;

CREATE INDEX idx_process_questionnaire_questions_section_order
  ON process_questionnaire_questions(section_id, sort_order);

ALTER TABLE process_questionnaire_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master_process_questionnaire_sections"
  ON process_questionnaire_sections FOR ALL
  USING (is_admin_master());

CREATE POLICY "office_read_questionnaire_sections"
  ON process_questionnaire_sections FOR SELECT
  USING (
    questionnaire_id IN (
      SELECT id FROM process_questionnaires WHERE is_active = true
    )
  );

CREATE TRIGGER update_process_questionnaire_sections_updated_at
  BEFORE UPDATE ON process_questionnaire_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
