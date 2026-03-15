-- ============================================
-- BPM Office SaaS — Process Catalog & Onboarding
-- ============================================

ALTER TABLE offices
  ADD COLUMN processes_initialized_at TIMESTAMPTZ;

-- Base catalog of standard processes managed by admin master
CREATE TABLE base_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT,
  template_url TEXT,
  template_label TEXT,
  flowchart_image_url TEXT,
  management_checklist JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_base_processes_active_order ON base_processes(is_active, sort_order, name);

-- Process activation questionnaire managed by admin master
CREATE TABLE process_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_required_first_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_process_questionnaires_single_active
  ON process_questionnaires(is_active)
  WHERE is_active = true;

CREATE TABLE process_questionnaire_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES process_questionnaires(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  helper_text TEXT,
  question_type TEXT NOT NULL CHECK (question_type IN ('text', 'single_select', 'multi_select')),
  is_required BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_process_questionnaire_questions_order
  ON process_questionnaire_questions(questionnaire_id, sort_order);

CREATE TABLE process_questionnaire_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES process_questionnaire_questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT,
  helper_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_process_questionnaire_options_order
  ON process_questionnaire_options(question_id, sort_order);

CREATE TABLE process_questionnaire_option_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id UUID NOT NULL REFERENCES process_questionnaire_options(id) ON DELETE CASCADE,
  base_process_id UUID NOT NULL REFERENCES base_processes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(option_id, base_process_id)
);

CREATE TABLE office_questionnaire_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES process_questionnaires(id) ON DELETE RESTRICT,
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  leader_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  generated_process_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_office_questionnaire_submissions_office
  ON office_questionnaire_submissions(office_id, submitted_at DESC);

CREATE TABLE office_questionnaire_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES office_questionnaire_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES process_questionnaire_questions(id) ON DELETE RESTRICT,
  answer_text TEXT,
  selected_option_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(submission_id, question_id)
);

CREATE TABLE office_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  base_process_id UUID NOT NULL REFERENCES base_processes(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  template_url TEXT,
  template_label TEXT,
  flowchart_image_url TEXT,
  origin TEXT NOT NULL CHECK (origin IN ('questionnaire', 'manual')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'archived')),
  owner_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  added_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(office_id, base_process_id)
);

CREATE INDEX idx_office_processes_office_status
  ON office_processes(office_id, status, selected_at DESC);

CREATE TABLE office_process_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_process_id UUID NOT NULL REFERENCES office_processes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_office_process_checklist_order
  ON office_process_checklist_items(office_process_id, sort_order, created_at);

CREATE TABLE office_process_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_process_id UUID NOT NULL REFERENCES office_processes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  attachment_url TEXT NOT NULL,
  attachment_type TEXT NOT NULL DEFAULT 'other' CHECK (attachment_type IN ('template', 'flowchart', 'support', 'other')),
  created_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE office_process_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_process_id UUID NOT NULL REFERENCES office_processes(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  actor_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_office_process_history_process
  ON office_process_history(office_process_id, created_at DESC);

ALTER TABLE base_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_questionnaire_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_questionnaire_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_questionnaire_option_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_questionnaire_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_questionnaire_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_process_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_process_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_process_history ENABLE ROW LEVEL SECURITY;

-- Admin master access
CREATE POLICY "admin_master_base_processes" ON base_processes FOR ALL
  USING (is_admin_master());

CREATE POLICY "admin_master_process_questionnaires" ON process_questionnaires FOR ALL
  USING (is_admin_master());

CREATE POLICY "admin_master_process_questionnaire_questions" ON process_questionnaire_questions FOR ALL
  USING (is_admin_master());

CREATE POLICY "admin_master_process_questionnaire_options" ON process_questionnaire_options FOR ALL
  USING (is_admin_master());

CREATE POLICY "admin_master_process_questionnaire_option_processes" ON process_questionnaire_option_processes FOR ALL
  USING (is_admin_master());

CREATE POLICY "admin_master_office_questionnaire_submissions" ON office_questionnaire_submissions FOR ALL
  USING (is_admin_master());

CREATE POLICY "admin_master_office_questionnaire_answers" ON office_questionnaire_answers FOR ALL
  USING (is_admin_master());

CREATE POLICY "admin_master_office_processes" ON office_processes FOR ALL
  USING (is_admin_master());

CREATE POLICY "admin_master_office_process_checklist_items" ON office_process_checklist_items FOR ALL
  USING (is_admin_master());

CREATE POLICY "admin_master_office_process_attachments" ON office_process_attachments FOR ALL
  USING (is_admin_master());

CREATE POLICY "admin_master_office_process_history" ON office_process_history FOR ALL
  USING (is_admin_master());

-- Office access
CREATE POLICY "office_read_active_base_processes" ON base_processes FOR SELECT
  USING (is_active = true);

CREATE POLICY "office_read_active_questionnaires" ON process_questionnaires FOR SELECT
  USING (is_active = true);

CREATE POLICY "office_read_questionnaire_questions" ON process_questionnaire_questions FOR SELECT
  USING (
    questionnaire_id IN (
      SELECT id FROM process_questionnaires WHERE is_active = true
    )
  );

CREATE POLICY "office_read_questionnaire_options" ON process_questionnaire_options FOR SELECT
  USING (
    question_id IN (
      SELECT id
      FROM process_questionnaire_questions
      WHERE questionnaire_id IN (
        SELECT id FROM process_questionnaires WHERE is_active = true
      )
    )
  );

CREATE POLICY "office_read_questionnaire_option_processes" ON process_questionnaire_option_processes FOR SELECT
  USING (true);

CREATE POLICY "office_manage_questionnaire_submissions" ON office_questionnaire_submissions FOR ALL
  USING (office_id = my_office_id());

CREATE POLICY "office_manage_questionnaire_answers" ON office_questionnaire_answers FOR ALL
  USING (
    submission_id IN (
      SELECT id FROM office_questionnaire_submissions WHERE office_id = my_office_id()
    )
  );

CREATE POLICY "office_manage_office_processes" ON office_processes FOR ALL
  USING (office_id = my_office_id());

CREATE POLICY "office_manage_office_process_checklist_items" ON office_process_checklist_items FOR ALL
  USING (
    office_process_id IN (
      SELECT id FROM office_processes WHERE office_id = my_office_id()
    )
  );

CREATE POLICY "office_manage_office_process_attachments" ON office_process_attachments FOR ALL
  USING (
    office_process_id IN (
      SELECT id FROM office_processes WHERE office_id = my_office_id()
    )
  );

CREATE POLICY "office_manage_office_process_history" ON office_process_history FOR ALL
  USING (office_id = my_office_id());

CREATE TRIGGER update_base_processes_updated_at
  BEFORE UPDATE ON base_processes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_process_questionnaires_updated_at
  BEFORE UPDATE ON process_questionnaires
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_office_processes_updated_at
  BEFORE UPDATE ON office_processes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_office_process_checklist_items_updated_at
  BEFORE UPDATE ON office_process_checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
