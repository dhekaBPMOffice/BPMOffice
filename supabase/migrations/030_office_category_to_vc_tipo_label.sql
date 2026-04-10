-- Migra legado: texto em `category` passa a `vc_tipo_label` quando ainda não há rótulo; depois remove `category`.

UPDATE office_processes
SET vc_tipo_label = NULLIF(trim(category), '')
WHERE
  category IS NOT NULL
  AND trim(category) <> ''
  AND (vc_tipo_label IS NULL OR trim(vc_tipo_label) = '');

UPDATE office_processes SET category = NULL WHERE category IS NOT NULL;
