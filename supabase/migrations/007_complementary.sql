-- ============================================
-- BPM Office SaaS — Complementary Area Tables
-- ============================================

-- Knowledge base
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'communication_plan', 'event', 'activity', 'best_practice',
    'training_material', 'lecture', 'document_template', 'prompt_template'
  )),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  file_url TEXT,
  source_type TEXT,
  source_id TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_base_office ON knowledge_base(office_id);
CREATE INDEX idx_knowledge_base_category ON knowledge_base(category);

-- Training plans
CREATE TABLE training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  role_target TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  is_platform_content BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_plans_office ON training_plans(office_id);

-- Training records
CREATE TABLE training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_records_office ON training_records(office_id);
CREATE INDEX idx_training_records_user ON training_records(user_id);
CREATE INDEX idx_training_records_plan ON training_records(plan_id);

-- Backups
CREATE TABLE backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID REFERENCES offices(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('manual', 'automatic')),
  status TEXT NOT NULL DEFAULT 'pending',
  file_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_backups_office ON backups(office_id);

-- Backup config (schedule)
CREATE TABLE backup_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID UNIQUE REFERENCES offices(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform-wide backup config (office_id null = admin)
CREATE TABLE platform_backup_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT false,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_backup_config_updated_at
  BEFORE UPDATE ON backup_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_backup_config_updated_at
  BEFORE UPDATE ON platform_backup_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Updated_at trigger for knowledge_base
-- ============================================

CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_backup_config ENABLE ROW LEVEL SECURITY;

-- Admin can read all
CREATE POLICY "admin_read_all_knowledge_base" ON knowledge_base FOR SELECT
  USING (is_admin_master());

CREATE POLICY "admin_read_all_training_plans" ON training_plans FOR SELECT
  USING (is_admin_master());

CREATE POLICY "admin_read_all_training_records" ON training_records FOR SELECT
  USING (is_admin_master());

CREATE POLICY "admin_read_all_backups" ON backups FOR SELECT
  USING (is_admin_master());

-- Office members manage their own data
CREATE POLICY "office_manage_knowledge_base" ON knowledge_base FOR ALL
  USING (office_id = my_office_id());

CREATE POLICY "office_manage_training_plans" ON training_plans FOR ALL
  USING (office_id = my_office_id());

CREATE POLICY "office_manage_training_records" ON training_records FOR ALL
  USING (office_id = my_office_id());

CREATE POLICY "office_manage_backups" ON backups FOR ALL
  USING (office_id = my_office_id() OR office_id IS NULL);

-- Backup config: admin manages platform, office manages own
CREATE POLICY "admin_manage_platform_backup_config" ON platform_backup_config FOR ALL
  USING (is_admin_master());

CREATE POLICY "office_manage_backup_config" ON backup_config FOR ALL
  USING (office_id = my_office_id());
