-- ============================================
-- BPM Office SaaS — Ciclo BPM por processo + cadeia de valor
-- ============================================

-- Origem de criação da instância (complementa origin questionnaire/manual/value_chain)
ALTER TABLE office_processes
  ADD COLUMN creation_source TEXT NOT NULL DEFAULT 'from_catalog'
    CHECK (creation_source IN ('from_catalog', 'created_in_value_chain'));

UPDATE office_processes SET creation_source = 'from_catalog';

-- Origem ampliada (processos criados na tela de cadeia de valor)
ALTER TABLE office_processes DROP CONSTRAINT office_processes_origin_check;
ALTER TABLE office_processes ADD CONSTRAINT office_processes_origin_check
  CHECK (origin IN ('questionnaire', 'manual', 'value_chain'));

-- base_process_id opcional para processos criados só na cadeia
ALTER TABLE office_processes DROP CONSTRAINT office_processes_office_id_base_process_id_key;
CREATE UNIQUE INDEX idx_office_processes_office_base_unique
  ON office_processes(office_id, base_process_id)
  WHERE base_process_id IS NOT NULL;

ALTER TABLE office_processes
  ALTER COLUMN base_process_id DROP NOT NULL;

ALTER TABLE office_processes ADD CONSTRAINT office_processes_creation_base_consistency CHECK (
  (creation_source = 'from_catalog' AND base_process_id IS NOT NULL)
  OR (creation_source = 'created_in_value_chain' AND base_process_id IS NULL)
);

-- Posicionamento na cadeia de valor (instâncias vindas do catálogo ou criadas na cadeia)
ALTER TABLE office_processes
  ADD COLUMN value_chain_id UUID REFERENCES value_chains(id) ON DELETE SET NULL,
  ADD COLUMN vc_macroprocesso TEXT,
  ADD COLUMN vc_level1 TEXT,
  ADD COLUMN vc_level2 TEXT,
  ADD COLUMN vc_level3 TEXT,
  ADD COLUMN vc_process_type TEXT CHECK (vc_process_type IS NULL OR vc_process_type IN ('primario', 'apoio', 'gerencial')),
  ADD COLUMN vc_priority TEXT CHECK (vc_priority IS NULL OR vc_priority IN ('Alta', 'Média', 'Baixa')),
  ADD COLUMN vc_gestor_label TEXT,
  ADD COLUMN vc_general_status TEXT CHECK (
    vc_general_status IS NULL OR vc_general_status IN (
      'Não iniciado', 'Em andamento', 'Concluído', 'Em acompanhamento'
    )
  );

CREATE INDEX idx_office_processes_office_value_chain
  ON office_processes(office_id, value_chain_id)
  WHERE value_chain_id IS NOT NULL;

CREATE INDEX idx_office_processes_office_creation_source
  ON office_processes(office_id, creation_source);

-- Fases BPM (chaves estáveis em inglês; rótulos PT na aplicação)
CREATE TABLE office_process_bpm_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_process_id UUID NOT NULL REFERENCES office_processes(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN (
    'levantamento',
    'modelagem',
    'validacao',
    'descritivo',
    'proposicao_melhorias',
    'implantacao',
    'acompanhamento'
  )),
  stage_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (stage_status IN ('not_started', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(office_process_id, phase)
);

CREATE INDEX idx_office_process_bpm_phases_process
  ON office_process_bpm_phases(office_process_id, phase);

CREATE INDEX idx_office_process_bpm_phases_status
  ON office_process_bpm_phases(office_process_id, stage_status);

ALTER TABLE office_process_bpm_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master_office_process_bpm_phases" ON office_process_bpm_phases FOR ALL
  USING (is_admin_master());

CREATE POLICY "office_manage_office_process_bpm_phases" ON office_process_bpm_phases FOR ALL
  USING (
    office_process_id IN (
      SELECT id FROM office_processes WHERE office_id = my_office_id()
    )
  );

CREATE TRIGGER update_office_process_bpm_phases_updated_at
  BEFORE UPDATE ON office_process_bpm_phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed de fases para novos processos
CREATE OR REPLACE FUNCTION seed_office_process_bpm_phases()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO office_process_bpm_phases (office_process_id, phase, stage_status)
  SELECT NEW.id, v.phase, 'not_started'::text
  FROM (VALUES
    ('levantamento'),
    ('modelagem'),
    ('validacao'),
    ('descritivo'),
    ('proposicao_melhorias'),
    ('implantacao'),
    ('acompanhamento')
  ) AS v(phase)
  ON CONFLICT (office_process_id, phase) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_seed_office_process_bpm_phases
  AFTER INSERT ON office_processes
  FOR EACH ROW EXECUTE FUNCTION seed_office_process_bpm_phases();

-- Backfill: processos já existentes
INSERT INTO office_process_bpm_phases (office_process_id, phase, stage_status)
SELECT op.id, v.phase, 'not_started'::text
FROM office_processes op
CROSS JOIN (VALUES
  ('levantamento'),
  ('modelagem'),
  ('validacao'),
  ('descritivo'),
  ('proposicao_melhorias'),
  ('implantacao'),
  ('acompanhamento')
) AS v(phase)
ON CONFLICT (office_process_id, phase) DO NOTHING;
