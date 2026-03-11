-- Migração: Padrões de branding para identidade visual dheka
-- Troca azul genérico (#1d4ed8) por paleta dheka (#0097a7, #7b1fa2, #c2185b)

-- Atualiza registros existentes com cores legadas
UPDATE branding
SET
  primary_color = '#0097a7',
  secondary_color = '#7b1fa2',
  accent_color = '#c2185b'
WHERE primary_color = '#1d4ed8';

-- Altera DEFAULTs para novas inserções
ALTER TABLE branding
  ALTER COLUMN primary_color SET DEFAULT '#0097a7',
  ALTER COLUMN secondary_color SET DEFAULT '#7b1fa2',
  ALTER COLUMN accent_color SET DEFAULT '#c2185b';
