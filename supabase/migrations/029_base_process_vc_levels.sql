-- Cadeia de valor no catálogo base: macroprocesso + níveis (paridade com office_processes).

ALTER TABLE base_processes
  ADD COLUMN IF NOT EXISTS vc_macroprocesso TEXT,
  ADD COLUMN IF NOT EXISTS vc_levels TEXT[] NOT NULL DEFAULT '{}';

-- Legado: o nome passa a ser representado como Nível 1 quando ainda não há hierarquia explícita.
UPDATE base_processes
SET
  vc_levels = CASE
    WHEN trim(name) <> '' THEN ARRAY[trim(name)]::text[]
    ELSE '{}'::text[]
  END
WHERE vc_levels = '{}';

UPDATE base_processes
SET
  name = COALESCE(
    NULLIF(trim(vc_macroprocesso), ''),
    vc_levels[1],
    'Processo'
  );
