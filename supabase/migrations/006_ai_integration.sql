-- ============================================
-- BPM Office SaaS — AI Integration Tables
-- ============================================

-- AI interactions (audit log of all AI generations)
CREATE TABLE ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  project_id UUID REFERENCES bpm_projects(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_used TEXT,
  input_data TEXT,
  output_data TEXT,
  tokens_used INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_interactions_office ON ai_interactions(office_id);
CREATE INDEX idx_ai_interactions_project ON ai_interactions(project_id);
CREATE INDEX idx_ai_interactions_created ON ai_interactions(created_at DESC);

-- AI result versions (saved versions of generated content)
CREATE TABLE ai_result_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID NOT NULL REFERENCES ai_interactions(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  content TEXT NOT NULL,
  edited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_result_versions_interaction ON ai_result_versions(interaction_id);
CREATE INDEX idx_ai_result_versions_office ON ai_result_versions(office_id);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_result_versions ENABLE ROW LEVEL SECURITY;

-- Admin can read all
CREATE POLICY "admin_read_all_ai_interactions" ON ai_interactions FOR SELECT
  USING (is_admin_master());

CREATE POLICY "admin_read_all_ai_result_versions" ON ai_result_versions FOR SELECT
  USING (is_admin_master());

-- Office members manage their own data
CREATE POLICY "office_manage_ai_interactions" ON ai_interactions FOR ALL
  USING (office_id = my_office_id());

CREATE POLICY "office_manage_ai_result_versions" ON ai_result_versions FOR ALL
  USING (office_id = my_office_id());
