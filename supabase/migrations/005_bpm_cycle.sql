-- ============================================
-- BPM Office SaaS — BPM Cycle / Demand Management
-- ============================================

-- Demands
CREATE TABLE demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  external_ticket_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_demands_office ON demands(office_id);
CREATE INDEX idx_demands_status ON demands(status);

-- BPM Projects (one per demand)
CREATE TABLE bpm_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  scope TEXT,
  estimates TEXT,
  project_plan TEXT,
  schedule JSONB,
  status TEXT NOT NULL DEFAULT 'planning',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(demand_id)
);

CREATE INDEX idx_bpm_projects_office ON bpm_projects(office_id);
CREATE INDEX idx_bpm_projects_demand ON bpm_projects(demand_id);

-- Survey Scripts
CREATE TABLE survey_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bpm_projects(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_survey_scripts_project ON survey_scripts(project_id);

-- Survey Responses
CREATE TABLE survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID NOT NULL REFERENCES survey_scripts(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  respondent TEXT,
  answers JSONB NOT NULL DEFAULT '{}',
  transcription TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_survey_responses_script ON survey_responses(script_id);

-- Process Models
CREATE TABLE process_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bpm_projects(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bpmn_file_url TEXT,
  png_file_url TEXT,
  description TEXT,
  procedures TEXT,
  version INT NOT NULL DEFAULT 1,
  model_type TEXT NOT NULL CHECK (model_type IN ('as_is', 'to_be')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_process_models_project ON process_models(project_id);

-- Analysis Results
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bpm_projects(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  technique TEXT,
  strengths JSONB NOT NULL DEFAULT '[]',
  weaknesses JSONB NOT NULL DEFAULT '[]',
  criticality_level TEXT CHECK (criticality_level IN ('baixa', 'media', 'alta', 'critica')),
  recommendations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analysis_results_project ON analysis_results(project_id);

-- Improvements
CREATE TABLE improvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bpm_projects(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  technique TEXT,
  suggestions JSONB NOT NULL DEFAULT '[]',
  prioritization JSONB NOT NULL DEFAULT '{}',
  roadmap JSONB NOT NULL DEFAULT '[]',
  associated_problems TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_improvements_project ON improvements(project_id);

-- Implementation Plans
CREATE TABLE implementation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bpm_projects(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  plan_fields JSONB NOT NULL DEFAULT '{}',
  observations TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  progress JSONB NOT NULL DEFAULT '{}',
  report TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_implementation_plans_project ON implementation_plans(project_id);

-- Closures
CREATE TABLE closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES bpm_projects(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  checklist JSONB NOT NULL DEFAULT '[]',
  presentation_content TEXT,
  final_report TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

CREATE INDEX idx_closures_project ON closures(project_id);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE bpm_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE improvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE implementation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE closures ENABLE ROW LEVEL SECURITY;

-- Admin can read all
CREATE POLICY "admin_read_all_demands" ON demands FOR SELECT
  USING (is_admin_master());

CREATE POLICY "admin_read_all_bpm_projects" ON bpm_projects FOR SELECT
  USING (is_admin_master());

CREATE POLICY "admin_read_all_survey_scripts" ON survey_scripts FOR SELECT
  USING (is_admin_master());

CREATE POLICY "admin_read_all_survey_responses" ON survey_responses FOR SELECT
  USING (is_admin_master());

CREATE POLICY "admin_read_all_process_models" ON process_models FOR SELECT
  USING (is_admin_master());

CREATE POLICY "admin_read_all_analysis_results" ON analysis_results FOR SELECT
  USING (is_admin_master());

CREATE POLICY "admin_read_all_improvements" ON improvements FOR SELECT
  USING (is_admin_master());

CREATE POLICY "admin_read_all_implementation_plans" ON implementation_plans FOR SELECT
  USING (is_admin_master());

CREATE POLICY "admin_read_all_closures" ON closures FOR SELECT
  USING (is_admin_master());

-- Office members manage their own (office_id = my_office_id())
CREATE POLICY "office_manage_demands" ON demands FOR ALL
  USING (office_id = my_office_id());

CREATE POLICY "office_manage_bpm_projects" ON bpm_projects FOR ALL
  USING (office_id = my_office_id());

CREATE POLICY "office_manage_survey_scripts" ON survey_scripts FOR ALL
  USING (office_id = my_office_id());

CREATE POLICY "office_manage_survey_responses" ON survey_responses FOR ALL
  USING (office_id = my_office_id());

CREATE POLICY "office_manage_process_models" ON process_models FOR ALL
  USING (office_id = my_office_id());

CREATE POLICY "office_manage_analysis_results" ON analysis_results FOR ALL
  USING (office_id = my_office_id());

CREATE POLICY "office_manage_improvements" ON improvements FOR ALL
  USING (office_id = my_office_id());

CREATE POLICY "office_manage_implementation_plans" ON implementation_plans FOR ALL
  USING (office_id = my_office_id());

CREATE POLICY "office_manage_closures" ON closures FOR ALL
  USING (office_id = my_office_id());

-- ============================================
-- Updated_at triggers
-- ============================================

CREATE TRIGGER update_demands_updated_at
  BEFORE UPDATE ON demands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bpm_projects_updated_at
  BEFORE UPDATE ON bpm_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_process_models_updated_at
  BEFORE UPDATE ON process_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_results_updated_at
  BEFORE UPDATE ON analysis_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_improvements_updated_at
  BEFORE UPDATE ON improvements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_implementation_plans_updated_at
  BEFORE UPDATE ON implementation_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_closures_updated_at
  BEFORE UPDATE ON closures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
