-- ============================================
-- Document Templates & Type Configs
-- ============================================

-- Modelos base reutilizáveis (estilos de exportação)
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  styles JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Configuração por tipo de documento exportável
CREATE TABLE document_type_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
  style_overrides JSONB NOT NULL DEFAULT '{}',
  sections JSONB NOT NULL DEFAULT '[]',
  branding_mapping JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_type_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master_all_document_templates" ON document_templates FOR ALL
  USING (is_admin_master());

CREATE POLICY "anyone_read_document_templates" ON document_templates FOR SELECT
  USING (true);

CREATE POLICY "admin_master_all_document_type_configs" ON document_type_configs FOR ALL
  USING (is_admin_master());

CREATE POLICY "anyone_read_document_type_configs" ON document_type_configs FOR SELECT
  USING (true);

-- updated_at triggers
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_type_configs_updated_at
  BEFORE UPDATE ON document_type_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Seed: modelo padrão + 2 tipos iniciais
-- ============================================

INSERT INTO document_templates (id, name, description, styles, is_default)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Padrão',
  'Modelo padrão da plataforma com estilos equilibrados.',
  '{
    "fontFamily": "Calibri",
    "title": { "fontSize": 16, "bold": true, "italic": false, "alignment": "left" },
    "subtitle": { "fontSize": 13, "bold": true, "italic": false, "alignment": "left" },
    "body": { "fontSize": 11, "bold": false, "italic": false, "alignment": "left" },
    "tableHeader": { "fontSize": 12, "bold": true, "italic": false, "alignment": "left" },
    "spacing": { "afterTitle": 12, "beforeSection": 10, "afterSectionTitle": 8, "bodyParagraph": 4 },
    "margins": { "top": 18, "left": 14, "right": 14, "bottom": 18 }
  }',
  true
);

INSERT INTO document_type_configs (document_type, label, template_id, sections, branding_mapping)
VALUES (
  'catalogo_servicos',
  'Catálogo de Serviços',
  'a0000000-0000-0000-0000-000000000001',
  '[
    { "type": "title", "key": "doc_title", "label": "Título do documento", "defaultText": "Catálogo de Serviços" },
    { "type": "rich_text", "key": "intro", "label": "Introdução", "content": "" },
    { "type": "data_table", "key": "services_table", "label": "Tabela de Serviços" },
    { "type": "rich_text", "key": "footer_note", "label": "Observações finais", "content": "" }
  ]',
  '{ "title.color": "primary_color", "subtitle.color": "primary_color", "tableHeader.color": "primary_color" }'
),
(
  'matriz_demanda_capacidade',
  'Matriz Demanda × Capacidade',
  'a0000000-0000-0000-0000-000000000001',
  '[
    { "type": "title", "key": "doc_title", "label": "Título do documento", "defaultText": "Matriz Demanda × Capacidade" },
    { "type": "rich_text", "key": "intro", "label": "Introdução", "content": "" },
    { "type": "data_list", "key": "quadrants_list", "label": "Quadrantes com serviços" },
    { "type": "rich_text", "key": "footer_note", "label": "Observações finais", "content": "" }
  ]',
  '{ "title.color": "primary_color", "subtitle.color": "primary_color" }'
);
