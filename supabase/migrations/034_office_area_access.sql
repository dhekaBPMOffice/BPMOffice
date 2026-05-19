-- Controle de acesso às áreas principais por plano e por escritório.

ALTER TABLE offices
  ADD COLUMN IF NOT EXISTS area_overrides JSONB NOT NULL DEFAULT '{}';

UPDATE plans
SET features = features || jsonb_build_object(
  'area_dashboard', COALESCE((features->>'area_dashboard')::boolean, true),
  'area_estrategia', COALESCE((features->>'area_estrategia')::boolean, true),
  'area_processos', COALESCE((features->>'area_processos')::boolean, true),
  'area_demandas', COALESCE((features->>'area_demandas')::boolean, true),
  'area_conhecimento', COALESCE((features->>'area_conhecimento')::boolean, true),
  'area_capacitacao', COALESCE((features->>'area_capacitacao')::boolean, true)
);

