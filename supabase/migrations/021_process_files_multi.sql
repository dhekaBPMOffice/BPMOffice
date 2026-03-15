-- ============================================
-- BPM Office SaaS — Múltiplos arquivos de template e fluxograma
-- ============================================

-- base_processes: suporta 1 ou mais arquivos de template e fluxograma
ALTER TABLE base_processes
  ADD COLUMN template_files JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN flowchart_files JSONB NOT NULL DEFAULT '[]';

-- office_processes: espelha a estrutura do base para o líder
ALTER TABLE office_processes
  ADD COLUMN template_files JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN flowchart_files JSONB NOT NULL DEFAULT '[]';

-- Migrar dados existentes: template_url/label -> template_files, flowchart_image_url -> flowchart_files
UPDATE base_processes
SET
  template_files = CASE
    WHEN template_url IS NOT NULL AND template_url != '' THEN
      jsonb_build_array(jsonb_build_object('url', template_url, 'label', COALESCE(template_label, '')))
    ELSE '[]'
  END,
  flowchart_files = CASE
    WHEN flowchart_image_url IS NOT NULL AND flowchart_image_url != '' THEN
      jsonb_build_array(jsonb_build_object('url', flowchart_image_url))
    ELSE '[]'
  END;

UPDATE office_processes
SET
  template_files = CASE
    WHEN template_url IS NOT NULL AND template_url != '' THEN
      jsonb_build_array(jsonb_build_object('url', template_url, 'label', COALESCE(template_label, '')))
    ELSE '[]'
  END,
  flowchart_files = CASE
    WHEN flowchart_image_url IS NOT NULL AND flowchart_image_url != '' THEN
      jsonb_build_array(jsonb_build_object('url', flowchart_image_url))
    ELSE '[]'
  END;

-- Manter colunas antigas por compatibilidade (podem ser removidas em migração futura)
