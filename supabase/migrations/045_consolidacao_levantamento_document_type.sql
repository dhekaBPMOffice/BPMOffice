-- Tipo de documento exportável: Consolidação do Levantamento (Plano Profissional)

INSERT INTO document_type_configs (document_type, label, template_id, sections, branding_mapping)
VALUES (
  'consolidacao_levantamento',
  'Documento Consolidação do Levantamento',
  'a0000000-0000-0000-0000-000000000001',
  '[
    { "type": "title", "key": "doc_title", "label": "Título do documento", "defaultText": "Consolidação do Levantamento" },
    { "type": "rich_text", "key": "intro", "label": "Introdução", "content": "" },
    { "type": "data_fields", "key": "consolidation_fields", "label": "Campos da consolidação" },
    { "type": "rich_text", "key": "footer_note", "label": "Observações finais", "content": "" }
  ]',
  '{ "title.color": "primary_color", "subtitle.color": "primary_color", "tableHeader.color": "primary_color" }'
);
