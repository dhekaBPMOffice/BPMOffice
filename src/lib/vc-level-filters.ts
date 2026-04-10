/** Profundidade máxima de filtros por nível na cadeia (evita dezenas de selects). */
export const MAX_VC_FILTER_DEPTH = 8;

export function uniqueSortedVc(values: (string | null | undefined)[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    const t = v?.trim();
    if (t) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

/** Número de colunas de filtro a mostrar: entre 1 e MAX, conforme dados. */
export function maxVcFilterDepthFromItems(items: { vcLevels: string[] }[]): number {
  let m = 0;
  for (const i of items) {
    m = Math.max(m, i.vcLevels?.length ?? 0);
  }
  return Math.min(MAX_VC_FILTER_DEPTH, Math.max(1, m));
}

/** Itens cujo caminho coincide com cada seleção não vazia em `levelFilters`. */
export function applyVcLevelFilters<T extends { vcLevels: string[] }>(
  items: T[],
  levelFilters: readonly string[]
): T[] {
  let out = items;
  for (let d = 0; d < MAX_VC_FILTER_DEPTH; d++) {
    const sel = levelFilters[d]?.trim();
    if (!sel) continue;
    out = out.filter((i) => (i.vcLevels[d] ?? "").trim() === sel);
  }
  return out;
}

/** Valores distintos no índice `depth`, respeitando prefixos já escolhidos em níveis anteriores. */
export function vcLevelOptionsAtDepth<T extends { vcLevels: string[] }>(
  items: T[],
  depth: number,
  levelFilters: readonly string[]
): string[] {
  let base = items;
  for (let j = 0; j < depth; j++) {
    const sel = levelFilters[j]?.trim();
    if (!sel) continue;
    base = base.filter((i) => (i.vcLevels[j] ?? "").trim() === sel);
  }
  return uniqueSortedVc(base.map((i) => i.vcLevels[depth]));
}

export function clearVcLevelFilters(): string[] {
  return Array(MAX_VC_FILTER_DEPTH).fill("");
}

export function hasAnyVcLevelFilter(levelFilters: readonly string[]): boolean {
  return levelFilters.some((f) => f.trim().length > 0);
}

/** Ao alterar o nível `depth`, limpa seleções mais profundas. */
export function setVcLevelFilterAt(
  prev: readonly string[],
  depth: number,
  value: string
): string[] {
  const next = [...prev];
  next[depth] = value;
  for (let d = depth + 1; d < MAX_VC_FILTER_DEPTH; d++) {
    next[d] = "";
  }
  return next;
}
