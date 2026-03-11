-- ============================================
-- BPM Office SaaS — Tactical Plan Documents
-- ============================================

-- Container for standalone tactical plans
CREATE TABLE tactical_plan_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  horizon TEXT NOT NULL DEFAULT 'trimestral' CHECK (horizon IN ('trimestral', 'semestral', 'anual')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  ai_context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tactical_plan_documents_office ON tactical_plan_documents(office_id);
CREATE INDEX idx_tactical_plan_documents_status ON tactical_plan_documents(office_id, status);

-- Extend tactical_plans with new columns
ALTER TABLE tactical_plans
  ADD COLUMN document_id UUID REFERENCES tactical_plan_documents(id) ON DELETE CASCADE,
  ADD COLUMN description TEXT,
  ADD COLUMN priority TEXT DEFAULT 'media' CHECK (priority IN ('alta', 'media', 'baixa')),
  ADD COLUMN kpi TEXT,
  ADD COLUMN category TEXT CHECK (category IN ('processos', 'pessoas', 'tecnologia', 'governanca', 'capacitacao', 'outro')),
  ADD COLUMN office_objective_id UUID REFERENCES office_objectives(id) ON DELETE SET NULL;

CREATE INDEX idx_tactical_plans_document ON tactical_plans(document_id);
CREATE INDEX idx_tactical_plans_priority ON tactical_plans(office_id, priority);

-- RLS for tactical_plan_documents
ALTER TABLE tactical_plan_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master_tactical_plan_documents" ON tactical_plan_documents FOR ALL
  USING (is_admin_master());
CREATE POLICY "office_manage_tactical_plan_documents" ON tactical_plan_documents FOR ALL
  USING (office_id = my_office_id());

-- Updated_at trigger
CREATE TRIGGER update_tactical_plan_documents_updated_at
  BEFORE UPDATE ON tactical_plan_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
