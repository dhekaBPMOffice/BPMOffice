-- Formulários públicos de abertura de demandas por escritório.

ALTER TABLE process_questionnaires
  ADD COLUMN IF NOT EXISTS is_demand_intake_template BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_process_questionnaires_single_demand_intake
  ON process_questionnaires(is_demand_intake_template)
  WHERE is_demand_intake_template = true;

ALTER TABLE demands
  ALTER COLUMN created_by DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS internal_observation TEXT;

CREATE TABLE IF NOT EXISTS office_demand_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  source_questionnaire_id UUID REFERENCES process_questionnaires(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  public_token TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(office_id),
  UNIQUE(public_token)
);

CREATE TABLE IF NOT EXISTS office_demand_form_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_demand_form_id UUID NOT NULL REFERENCES office_demand_forms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_office_demand_form_sections_order
  ON office_demand_form_sections(office_demand_form_id, sort_order);

CREATE TABLE IF NOT EXISTS office_demand_form_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_demand_form_id UUID NOT NULL REFERENCES office_demand_forms(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES office_demand_form_sections(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  helper_text TEXT,
  question_type TEXT NOT NULL CHECK (question_type IN ('short_text', 'long_text', 'single_select', 'multi_select')),
  is_required BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_office_demand_form_questions_section_order
  ON office_demand_form_questions(section_id, sort_order);

CREATE TABLE IF NOT EXISTS office_demand_form_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES office_demand_form_questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT,
  helper_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_office_demand_form_options_order
  ON office_demand_form_options(question_id, sort_order);

CREATE TABLE IF NOT EXISTS demand_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
  office_demand_form_id UUID NOT NULL REFERENCES office_demand_forms(id) ON DELETE RESTRICT,
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_area TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(demand_id)
);

CREATE INDEX IF NOT EXISTS idx_demand_form_submissions_office
  ON demand_form_submissions(office_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS demand_form_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES demand_form_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES office_demand_form_questions(id) ON DELETE RESTRICT,
  question_prompt TEXT NOT NULL,
  answer_text TEXT,
  selected_option_ids UUID[] NOT NULL DEFAULT '{}',
  selected_option_labels TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(submission_id, question_id)
);

ALTER TABLE office_demand_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_demand_form_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_demand_form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_demand_form_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE demand_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE demand_form_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_master_office_demand_forms" ON office_demand_forms;
CREATE POLICY "admin_master_office_demand_forms" ON office_demand_forms FOR ALL
  USING (is_admin_master());

DROP POLICY IF EXISTS "admin_master_office_demand_form_sections" ON office_demand_form_sections;
CREATE POLICY "admin_master_office_demand_form_sections" ON office_demand_form_sections FOR ALL
  USING (is_admin_master());

DROP POLICY IF EXISTS "admin_master_office_demand_form_questions" ON office_demand_form_questions;
CREATE POLICY "admin_master_office_demand_form_questions" ON office_demand_form_questions FOR ALL
  USING (is_admin_master());

DROP POLICY IF EXISTS "admin_master_office_demand_form_options" ON office_demand_form_options;
CREATE POLICY "admin_master_office_demand_form_options" ON office_demand_form_options FOR ALL
  USING (is_admin_master());

DROP POLICY IF EXISTS "admin_master_demand_form_submissions" ON demand_form_submissions;
CREATE POLICY "admin_master_demand_form_submissions" ON demand_form_submissions FOR ALL
  USING (is_admin_master());

DROP POLICY IF EXISTS "admin_master_demand_form_answers" ON demand_form_answers;
CREATE POLICY "admin_master_demand_form_answers" ON demand_form_answers FOR ALL
  USING (is_admin_master());

DROP POLICY IF EXISTS "office_manage_demand_forms" ON office_demand_forms;
CREATE POLICY "office_manage_demand_forms" ON office_demand_forms FOR ALL
  USING (office_id = my_office_id());

DROP POLICY IF EXISTS "office_manage_demand_form_sections" ON office_demand_form_sections;
CREATE POLICY "office_manage_demand_form_sections" ON office_demand_form_sections FOR ALL
  USING (
    office_demand_form_id IN (
      SELECT id FROM office_demand_forms WHERE office_id = my_office_id()
    )
  );

DROP POLICY IF EXISTS "office_manage_demand_form_questions" ON office_demand_form_questions;
CREATE POLICY "office_manage_demand_form_questions" ON office_demand_form_questions FOR ALL
  USING (
    office_demand_form_id IN (
      SELECT id FROM office_demand_forms WHERE office_id = my_office_id()
    )
  );

DROP POLICY IF EXISTS "office_manage_demand_form_options" ON office_demand_form_options;
CREATE POLICY "office_manage_demand_form_options" ON office_demand_form_options FOR ALL
  USING (
    question_id IN (
      SELECT question.id
      FROM office_demand_form_questions AS question
      JOIN office_demand_forms AS form ON form.id = question.office_demand_form_id
      WHERE form.office_id = my_office_id()
    )
  );

DROP POLICY IF EXISTS "office_read_demand_form_submissions" ON demand_form_submissions;
CREATE POLICY "office_read_demand_form_submissions" ON demand_form_submissions FOR SELECT
  USING (office_id = my_office_id());

DROP POLICY IF EXISTS "office_read_demand_form_answers" ON demand_form_answers;
CREATE POLICY "office_read_demand_form_answers" ON demand_form_answers FOR SELECT
  USING (
    submission_id IN (
      SELECT id FROM demand_form_submissions WHERE office_id = my_office_id()
    )
  );

DROP TRIGGER IF EXISTS update_office_demand_forms_updated_at ON office_demand_forms;
CREATE TRIGGER update_office_demand_forms_updated_at
  BEFORE UPDATE ON office_demand_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_office_demand_form_sections_updated_at ON office_demand_form_sections;
CREATE TRIGGER update_office_demand_form_sections_updated_at
  BEFORE UPDATE ON office_demand_form_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Atualiza o schema cache do PostgREST após criar novas colunas/tabelas.
NOTIFY pgrst, 'reload schema';
