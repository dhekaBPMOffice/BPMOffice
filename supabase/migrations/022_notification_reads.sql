-- Tabela para rastrear notificações lidas por usuário
CREATE TABLE notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(notification_id, profile_id)
);

CREATE INDEX idx_notification_reads_profile ON notification_reads(profile_id);
CREATE INDEX idx_notification_reads_notification ON notification_reads(notification_id);

ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- Usuário só acessa seus próprios registros de leitura
CREATE POLICY "users_read_own_notification_reads" ON notification_reads FOR SELECT
  USING (profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "users_insert_own_notification_reads" ON notification_reads FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
