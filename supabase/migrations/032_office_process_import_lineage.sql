-- Desacopla a origem do catálogo do vínculo ativo em `office_processes`.
-- Processos importados pelo escritório passam a manter apenas uma referência
-- histórica ao processo base usado no momento da cópia.

ALTER TABLE office_processes
  ADD COLUMN IF NOT EXISTS imported_from_base_process_id UUID;

COMMENT ON COLUMN office_processes.imported_from_base_process_id IS
  'ID do processo base usado apenas como origem da importação; não implica sincronização posterior.';

UPDATE office_processes
SET imported_from_base_process_id = COALESCE(imported_from_base_process_id, base_process_id)
WHERE creation_source = 'from_catalog';

ALTER TABLE office_processes
  DROP CONSTRAINT IF EXISTS office_processes_creation_base_consistency;

DROP INDEX IF EXISTS idx_office_processes_office_base_unique;

ALTER TABLE office_processes
  DROP CONSTRAINT IF EXISTS office_processes_office_id_base_process_id_key;

ALTER TABLE office_processes
  ADD CONSTRAINT office_processes_creation_import_consistency CHECK (
    (creation_source = 'from_catalog' AND imported_from_base_process_id IS NOT NULL)
    OR (creation_source = 'created_in_value_chain' AND imported_from_base_process_id IS NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_office_processes_office_imported_base_unique
  ON office_processes(office_id, imported_from_base_process_id)
  WHERE imported_from_base_process_id IS NOT NULL;

ALTER TABLE office_processes
  DROP CONSTRAINT IF EXISTS office_processes_base_process_id_fkey;

UPDATE office_processes
SET base_process_id = NULL
WHERE base_process_id IS NOT NULL;
