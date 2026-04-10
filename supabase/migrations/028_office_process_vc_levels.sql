-- Níveis hierárquicos variáveis por processo (fonte de verdade: vc_levels).
-- Mantém vc_level1–vc_level3 espelhados para compatibilidade com código legado.

ALTER TABLE public.office_processes
  ADD COLUMN IF NOT EXISTS vc_levels text[] NOT NULL DEFAULT '{}';

UPDATE public.office_processes
SET vc_levels = COALESCE(
  (
    SELECT array_agg(v ORDER BY ord)
    FROM (
      SELECT 1 AS ord, NULLIF(trim(COALESCE(vc_level1, '')), '') AS v
      UNION ALL
      SELECT 2, NULLIF(trim(COALESCE(vc_level2, '')), '')
      UNION ALL
      SELECT 3, NULLIF(trim(COALESCE(vc_level3, '')), '')
    ) s
    WHERE v IS NOT NULL
  ),
  '{}'::text[]
);

COMMENT ON COLUMN public.office_processes.vc_levels IS 'Cadeia de níveis do processo (ordem: macro → detalhe).';
