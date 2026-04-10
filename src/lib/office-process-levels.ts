/**
 * Níveis hierárquicos do processo na cadeia de valor.
 * Fonte de verdade em BD: `vc_levels` (text[]); colunas `vc_level1`–`vc_level3` espelham os 3 primeiros.
 */

export type OfficeProcessLevelRow = {
  vc_levels?: unknown;
  vc_level1?: string | null;
  vc_level2?: string | null;
  vc_level3?: string | null;
};

/** Normaliza input do utilizador antes de gravar: trim, remove vazios (incl. intermédios). */
export function compactLevelsForPersist(levels: string[]): string[] {
  return levels.map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Lê níveis a partir da linha (prioriza `vc_levels`; fallback nas colunas legadas). */
export function levelsFromRow(row: OfficeProcessLevelRow): string[] {
  const raw = row.vc_levels;
  if (Array.isArray(raw) && raw.length > 0) {
    const parsed = raw.map((x) => String(x ?? "").trim()).filter((s) => s.length > 0);
    if (parsed.length > 0) return parsed;
  }
  const legacy = [row.vc_level1, row.vc_level2, row.vc_level3]
    .map((s) => (s ?? "").trim())
    .filter((s) => s.length > 0);
  return legacy;
}

/** Rótulo único para listas (ex.: "A › B › C"). */
export function formatNivelLabelFromLevels(levels: string[]): string | null {
  const parts = levels.map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts.join(" › ") : null;
}

/** Espelha os três primeiros níveis nas colunas legadas (para filtros/código antigo). */
export function mirrorFirstThreeLegacyColumns(levels: string[]): {
  vc_level1: string | null;
  vc_level2: string | null;
  vc_level3: string | null;
} {
  const c = compactLevelsForPersist(levels);
  return {
    vc_level1: c[0] ?? null,
    vc_level2: c[1] ?? null,
    vc_level3: c[2] ?? null,
  };
}

/** Estado inicial do formulário: pelo menos um campo; vazio se não há dados. */
export function draftLevelsForForm(
  row: OfficeProcessLevelRow,
  fallbackNivel1?: string | null
): string[] {
  const persisted = levelsFromRow(row);
  if (persisted.length > 0) return persisted;
  const fb = fallbackNivel1?.trim();
  return fb ? [fb] : [""];
}
