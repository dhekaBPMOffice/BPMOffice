-- ============================================
-- BPM Office SaaS — Office Config & Support Priority
-- ============================================

-- Office-specific configuration (AI, notifications)
CREATE TABLE office_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL UNIQUE REFERENCES offices(id) ON DELETE CASCADE,
  ai_api_key_encrypted TEXT,
  ai_learn_from_history BOOLEAN NOT NULL DEFAULT true,
  notification_review_reminders BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add priority to support tickets
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- RLS for office_config
ALTER TABLE office_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leader_manage_own_office_config" ON office_config FOR ALL
  USING (
    office_id = my_office_id()
    AND (SELECT role FROM profiles WHERE auth_user_id = auth.uid()) = 'leader'
  );

CREATE POLICY "office_read_own_config" ON office_config FOR SELECT
  USING (office_id = my_office_id());

CREATE TRIGGER update_office_config_updated_at
  BEFORE UPDATE ON office_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Office users can create support tickets
CREATE POLICY "office_insert_support_tickets" ON support_tickets FOR INSERT
  WITH CHECK (office_id = my_office_id());
