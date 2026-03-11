-- ============================================
-- BPM Office SaaS — Strategic Area Tables
-- ============================================

-- Value chains (cadeia de valor)
CREATE TABLE value_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('gestao', 'negocio', 'apoio')),
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_value_chains_office ON value_chains(office_id);
CREATE INDEX idx_value_chains_category ON value_chains(office_id, category, order_index);

-- SWOT items
CREATE TABLE swot_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('strength', 'weakness', 'opportunity', 'threat')),
  content TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('empresa', 'escritorio')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_swot_items_office ON swot_items(office_id);
CREATE INDEX idx_swot_items_type ON swot_items(office_id, type);

-- Strategic objectives
CREATE TABLE strategic_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  swot_item_id UUID REFERENCES swot_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_strategic_objectives_office ON strategic_objectives(office_id);

-- Tactical plans
CREATE TABLE tactical_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL REFERENCES strategic_objectives(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  responsible TEXT,
  deadline DATE,
  reminder_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tactical_plans_office ON tactical_plans(office_id);
CREATE INDEX idx_tactical_plans_objective ON tactical_plans(objective_id);

-- Office frameworks (which frameworks are active for each office)
CREATE TABLE office_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  framework_id UUID NOT NULL REFERENCES process_frameworks(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(office_id, framework_id)
);

CREATE INDEX idx_office_frameworks_office ON office_frameworks(office_id);

-- Service portfolio
CREATE TABLE service_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  base_service_id UUID REFERENCES base_services(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  methodology TEXT,
  deliverables TEXT,
  resources TEXT,
  team TEXT,
  pricing TEXT,
  marketing TEXT,
  demand_level TEXT CHECK (demand_level IN ('alta', 'baixa')),
  capacity_level TEXT CHECK (capacity_level IN ('alta', 'baixa')),
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_portfolio_office ON service_portfolio(office_id);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE value_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE swot_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE tactical_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_portfolio ENABLE ROW LEVEL SECURITY;

-- value_chains
CREATE POLICY "admin_master_value_chains" ON value_chains FOR ALL
  USING (is_admin_master());
CREATE POLICY "office_manage_value_chains" ON value_chains FOR ALL
  USING (office_id = my_office_id());

-- swot_items
CREATE POLICY "admin_master_swot_items" ON swot_items FOR ALL
  USING (is_admin_master());
CREATE POLICY "office_manage_swot_items" ON swot_items FOR ALL
  USING (office_id = my_office_id());

-- strategic_objectives
CREATE POLICY "admin_master_strategic_objectives" ON strategic_objectives FOR ALL
  USING (is_admin_master());
CREATE POLICY "office_manage_strategic_objectives" ON strategic_objectives FOR ALL
  USING (office_id = my_office_id());

-- tactical_plans
CREATE POLICY "admin_master_tactical_plans" ON tactical_plans FOR ALL
  USING (is_admin_master());
CREATE POLICY "office_manage_tactical_plans" ON tactical_plans FOR ALL
  USING (office_id = my_office_id());

-- office_frameworks
CREATE POLICY "admin_master_office_frameworks" ON office_frameworks FOR ALL
  USING (is_admin_master());
CREATE POLICY "office_manage_office_frameworks" ON office_frameworks FOR ALL
  USING (office_id = my_office_id());

-- service_portfolio
CREATE POLICY "admin_master_service_portfolio" ON service_portfolio FOR ALL
  USING (is_admin_master());
CREATE POLICY "office_manage_service_portfolio" ON service_portfolio FOR ALL
  USING (office_id = my_office_id());

-- ============================================
-- Updated_at triggers
-- ============================================

CREATE TRIGGER update_value_chains_updated_at
  BEFORE UPDATE ON value_chains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tactical_plans_updated_at
  BEFORE UPDATE ON tactical_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_portfolio_updated_at
  BEFORE UPDATE ON service_portfolio
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
