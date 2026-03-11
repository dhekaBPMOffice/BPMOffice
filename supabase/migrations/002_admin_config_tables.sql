-- ============================================
-- BPM Office SaaS — Admin Config Tables
-- ============================================

-- Process frameworks (default process templates)
CREATE TABLE process_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Base services catalog
CREATE TABLE base_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  methodology TEXT,
  deliverables TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform settings (key-value JSON)
CREATE TABLE platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI configuration
CREATE TABLE ai_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_provider TEXT NOT NULL DEFAULT 'openai',
  default_model TEXT NOT NULL DEFAULT 'gpt-4',
  default_api_key_encrypted TEXT,
  prompts JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications (sent to offices/users)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'office')),
  target_office_id UUID REFERENCES offices(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('platform', 'email', 'both')),
  sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Forms (form builder)
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  office_id UUID REFERENCES offices(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Form questions
CREATE TABLE form_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'select', 'rating')),
  options JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Form responses
CREATE TABLE form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES form_questions(id) ON DELETE CASCADE,
  respondent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Support tickets
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  office_id UUID REFERENCES offices(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_forms_office ON forms(office_id);
CREATE INDEX idx_form_questions_form ON form_questions(form_id);
CREATE INDEX idx_form_responses_form ON form_responses(form_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_office ON support_tickets(office_id);

-- Updated_at triggers
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_configs_updated_at
  BEFORE UPDATE ON ai_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE process_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Admin master: full access on all config tables
CREATE POLICY "admin_master_process_frameworks" ON process_frameworks FOR ALL
  USING (is_admin_master());

CREATE POLICY "admin_master_base_services" ON base_services FOR ALL
  USING (is_admin_master());

CREATE POLICY "admin_master_platform_settings" ON platform_settings FOR ALL
  USING (is_admin_master());

CREATE POLICY "admin_master_ai_configs" ON ai_configs FOR ALL
  USING (is_admin_master());

CREATE POLICY "admin_master_notifications" ON notifications FOR ALL
  USING (is_admin_master());

CREATE POLICY "admin_master_forms" ON forms FOR ALL
  USING (is_admin_master());

CREATE POLICY "admin_master_form_questions" ON form_questions FOR ALL
  USING (is_admin_master());

CREATE POLICY "admin_master_form_responses" ON form_responses FOR ALL
  USING (is_admin_master());

CREATE POLICY "admin_master_support_tickets" ON support_tickets FOR ALL
  USING (is_admin_master());

-- Office-scoped read policies
CREATE POLICY "office_read_frameworks" ON process_frameworks FOR SELECT
  USING (is_active = true);

CREATE POLICY "office_read_base_services" ON base_services FOR SELECT
  USING (is_active = true);

CREATE POLICY "office_read_platform_settings" ON platform_settings FOR SELECT
  USING (true);

CREATE POLICY "office_read_ai_configs" ON ai_configs FOR SELECT
  USING (is_active = true);

CREATE POLICY "office_read_own_notifications" ON notifications FOR SELECT
  USING (target_type = 'all' OR target_office_id = my_office_id());

CREATE POLICY "office_read_own_forms" ON forms FOR SELECT
  USING (office_id = my_office_id() OR office_id IS NULL);

CREATE POLICY "office_read_own_form_responses" ON form_responses FOR SELECT
  USING (
    form_id IN (SELECT id FROM forms WHERE office_id = my_office_id() OR office_id IS NULL)
  );

CREATE POLICY "office_read_own_support_tickets" ON support_tickets FOR SELECT
  USING (office_id = my_office_id());
