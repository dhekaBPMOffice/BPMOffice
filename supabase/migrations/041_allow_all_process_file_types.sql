-- Permitir qualquer tipo de arquivo no bucket de materiais de processos.
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'process-files';
