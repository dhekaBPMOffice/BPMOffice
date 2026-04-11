/** Valores por defeito e helpers para `office_config.process_type_options`. */

export const DEFAULT_PROCESS_TYPE_OPTIONS = ["Gestão", "Negócio", "Suporte"] as const;

const CANON_TO_DEFAULT_LABEL: Record<"primario" | "apoio" | "gerencial", string> = {
  primario: "Negócio",
  apoio: "Suporte",
  gerencial: "Gestão",
};

/** Normaliza lista da BD: trim, sem duplicados; vazio cai nos padrões. */
export function normalizeProcessTypeOptions(raw: string[] | null | undefined): string[] {
  if (!raw?.length) return [...DEFAULT_PROCESS_TYPE_OPTIONS];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of raw) {
    const t = String(s ?? "").trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.length > 0 ? out : [...DEFAULT_PROCESS_TYPE_OPTIONS];
}

/** Opções do `<select>`: lista configurada + valor atual se for legado/fora da lista. */
export function mergeProcessTypeOptionsForSelect(
  configured: string[],
  currentValue: string | null | undefined
): string[] {
  const base = normalizeProcessTypeOptions(configured);
  const cur = currentValue?.trim();
  if (cur && !base.includes(cur)) {
    return [...base, cur];
  }
  return base;
}

/** Valor inicial do formulário a partir da linha do processo. */
export function initialTipoLabelFromOfficeProcess(row: {
  vc_tipo_label?: string | null;
  vc_process_type?: string | null;
}): string {
  const lbl = String(row.vc_tipo_label ?? "").trim();
  if (lbl) return lbl;
  const t = row.vc_process_type;
  if (t === "primario" || t === "apoio" || t === "gerencial") {
    return CANON_TO_DEFAULT_LABEL[t];
  }
  return "";
}

/** Persistência: alinha `vc_process_type` quando o rótulo coincide com os três padrões do produto. */
export function mapTipoLabelToCanonical(
  label: string
): "primario" | "apoio" | "gerencial" | null {
  const s = label.trim();
  if (s === "Negócio") return "primario";
  if (s === "Suporte") return "apoio";
  if (s === "Gestão") return "gerencial";
  return null;
}
