/**
 * Filtros auxiliares para saber se um processo entra na “cadeia” (macro, VC ou criado na cadeia).
 * A lista da aba Gestão em `cadeia-valor/page.tsx` carrega todos os `office_processes` do escritório
 * (portfólio completo); o sync em debounce do cliente ignora `from_catalog` para não regravar
 * linhas do catálogo automaticamente.
 */

export const OFFICE_PROCESSES_CADEIA_CONFIG_POSTGREST_OR =
  "value_chain_id.not.is.null,vc_macroprocesso.not.is.null,creation_source.eq.created_in_value_chain";

export const OFFICE_PROCESSES_CADEIA_GESTAO_POSTGREST_OR =
  `${OFFICE_PROCESSES_CADEIA_CONFIG_POSTGREST_OR},creation_source.eq.from_catalog`;

/** Espelha a regra usada antes do portfólio completo; ainda útil para remoções / validações no servidor. */
export function officeProcessAppearsOnCadeiaGestaoList(row: {
  creation_source: string | null;
  value_chain_id: string | null;
  vc_macroprocesso: string | null;
}): boolean {
  if (row.value_chain_id) return true;
  const macro = row.vc_macroprocesso?.trim();
  if (macro) return true;
  if (row.creation_source === "created_in_value_chain") return true;
  return row.creation_source === "from_catalog";
}
