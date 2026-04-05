-- Rótulo livre de categoria (Tipo) na cadeia de valor; vc_process_type permanece só para valores canónicos.
ALTER TABLE office_processes
  ADD COLUMN IF NOT EXISTS vc_tipo_label TEXT;

UPDATE office_processes
SET vc_tipo_label = CASE vc_process_type
  WHEN 'primario' THEN 'Primário'
  WHEN 'gerencial' THEN 'Gerencial'
  WHEN 'apoio' THEN 'Apoio'
  ELSE NULL
END
WHERE vc_tipo_label IS NULL
  AND vc_process_type IS NOT NULL;
