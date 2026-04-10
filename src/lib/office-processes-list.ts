import {
  BPM_PHASE_SLUGS,
  computeCurrentBpmPhaseSlug,
  type BpmPhaseSlug,
} from "@/lib/bpm-phases";
import type { OfficeProcessStatus } from "@/types/database";
import { levelsFromRow, type OfficeProcessLevelRow } from "@/lib/office-process-levels";

export type ProcessosSortKey =
  | "selected_at_desc"
  | "selected_at_asc"
  | "name_asc"
  | "name_desc"
  | "fase_bpm"
  | "tipo"
  | "nivel";

export const PROCESSOS_SORT_DEFAULT: ProcessosSortKey = "selected_at_desc";

export const PROCESSOS_SORT_OPTIONS: { value: ProcessosSortKey; label: string }[] = [
  { value: "selected_at_desc", label: "Adicionados (mais recentes)" },
  { value: "selected_at_asc", label: "Adicionados (mais antigos)" },
  { value: "name_asc", label: "Nome (A–Z)" },
  { value: "name_desc", label: "Nome (Z–A)" },
  { value: "fase_bpm", label: "Fase BPM (ciclo)" },
  { value: "tipo", label: "Tipo (cadeia)" },
  { value: "nivel", label: "Níveis (cadeia)" },
];

const VALID_SORT_KEYS = new Set<string>(PROCESSOS_SORT_OPTIONS.map((o) => o.value));

export type ProcessosListQuery = {
  origem: string;
  fase: string;
  tipo: string;
  n1: string;
  n2: string;
  n3: string;
  status: string;
  q: string;
  ordenar: ProcessosSortKey;
  vista: "grade" | "lista";
};

export function parseProcessosListQuery(sp: Record<string, string | string[] | undefined>): ProcessosListQuery {
  const g = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const ordenarRaw = g("ordenar") ?? "";
  const ordenar = (VALID_SORT_KEYS.has(ordenarRaw) ? ordenarRaw : PROCESSOS_SORT_DEFAULT) as ProcessosSortKey;
  const vistaRaw = g("vista") ?? "";
  const vista = vistaRaw === "grade" ? "grade" : "lista";
  return {
    origem: g("origem") ?? "todos",
    fase: g("fase") ?? "",
    tipo: g("tipo") ?? "",
    n1: g("n1") ?? "",
    n2: g("n2") ?? "",
    n3: g("n3") ?? "",
    status: g("status") ?? "",
    q: g("q") ?? "",
    ordenar,
    vista,
  };
}

/** Monta URL para `/escritorio/processos` omitindo valores vazios / padrão. */
export function buildProcessosHref(state: Partial<ProcessosListQuery>): string {
  const merged: ProcessosListQuery = {
    origem: state.origem ?? "todos",
    fase: state.fase ?? "",
    tipo: state.tipo ?? "",
    n1: state.n1 ?? "",
    n2: state.n2 ?? "",
    n3: state.n3 ?? "",
    status: state.status ?? "",
    q: state.q ?? "",
    ordenar: (state.ordenar as ProcessosSortKey) ?? PROCESSOS_SORT_DEFAULT,
    vista: state.vista === "grade" ? "grade" : "lista",
  };
  const sp = new URLSearchParams();
  if (merged.origem && merged.origem !== "todos") sp.set("origem", merged.origem);
  if (merged.fase) sp.set("fase", merged.fase);
  if (merged.tipo) sp.set("tipo", merged.tipo);
  if (merged.n1) sp.set("n1", merged.n1);
  if (merged.n2) sp.set("n2", merged.n2);
  if (merged.n3) sp.set("n3", merged.n3);
  if (merged.status) sp.set("status", merged.status);
  if (merged.q.trim()) sp.set("q", merged.q.trim());
  if (merged.ordenar && merged.ordenar !== PROCESSOS_SORT_DEFAULT) sp.set("ordenar", merged.ordenar);
  if (merged.vista === "grade") sp.set("vista", "grade");
  const qs = sp.toString();
  return qs ? `/escritorio/processos?${qs}` : "/escritorio/processos";
}

export function formatVcProcessTypeLabel(
  vcProcessType: string | null,
  vcTipoLabel: string | null
): string | null {
  const t = vcTipoLabel?.trim();
  if (t) return t;
  if (vcProcessType === "primario") return "Primário";
  if (vcProcessType === "gerencial") return "Gerencial";
  if (vcProcessType === "apoio") return "Apoio";
  return null;
}

type BpmPhaseRow = { phase: string; stage_status: string };

export type OfficeProcessRowForList = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: OfficeProcessStatus;
  selected_at: string;
  creation_source: string;
  origin: string;
  flowchart_files: unknown;
  flowchart_image_url: string | null;
  template_files: unknown;
  template_url: string | null;
  template_label: string | null;
  vc_process_type: string | null;
  vc_tipo_label: string | null;
  vc_levels?: unknown;
  vc_level1: string | null;
  vc_level2: string | null;
  vc_level3: string | null;
  value_chain_id: string | null;
  vc_macroprocesso: string | null;
  owner_profile: { full_name?: string } | null;
  office_process_bpm_phases: BpmPhaseRow[] | null;
};

const TIPO_RANK: Record<string, number> = {
  primario: 0,
  gerencial: 1,
  apoio: 2,
};

function tipoRank(vcProcessType: string | null): number {
  if (!vcProcessType) return 3;
  return TIPO_RANK[vcProcessType] ?? 4;
}

function nivelSortKey(p: OfficeProcessRowForList): string {
  return levelsFromRow(p as OfficeProcessLevelRow).join("\u0000");
}

function faseIndex(slug: BpmPhaseSlug | null): number {
  if (!slug) return 999;
  const i = BPM_PHASE_SLUGS.indexOf(slug);
  return i === -1 ? 999 : i;
}

export function sortOfficeProcesses<T extends OfficeProcessRowForList>(
  rows: T[],
  ordenar: ProcessosSortKey
): T[] {
  const copy = [...rows];
  const cmpStr = (a: string, b: string) => a.localeCompare(b, "pt-BR", { sensitivity: "base" });

  copy.sort((a, b) => {
    switch (ordenar) {
      case "name_asc":
        return cmpStr(a.name ?? "", b.name ?? "");
      case "name_desc":
        return cmpStr(b.name ?? "", a.name ?? "");
      case "selected_at_asc":
        return new Date(a.selected_at).getTime() - new Date(b.selected_at).getTime();
      case "selected_at_desc":
        return new Date(b.selected_at).getTime() - new Date(a.selected_at).getTime();
      case "fase_bpm": {
        const fa = computeCurrentBpmPhaseSlug(a.office_process_bpm_phases ?? []);
        const fb = computeCurrentBpmPhaseSlug(b.office_process_bpm_phases ?? []);
        const d = faseIndex(fa) - faseIndex(fb);
        if (d !== 0) return d;
        return cmpStr(a.name ?? "", b.name ?? "");
      }
      case "tipo": {
        const d = tipoRank(a.vc_process_type) - tipoRank(b.vc_process_type);
        if (d !== 0) return d;
        return cmpStr(a.name ?? "", b.name ?? "");
      }
      case "nivel": {
        const d = cmpStr(nivelSortKey(a), nivelSortKey(b));
        if (d !== 0) return d;
        return cmpStr(a.name ?? "", b.name ?? "");
      }
      default:
        return 0;
    }
  });

  return copy;
}

export function applyProcessosFilters<T extends OfficeProcessRowForList>(
  rows: T[],
  opts: {
    faseFilter: BpmPhaseSlug | "";
    tipo: string;
    n1: string;
    n2: string;
    n3: string;
    status: OfficeProcessStatus | "";
    q: string;
  }
): T[] {
  let out = rows;
  const qNorm = opts.q.trim().toLowerCase();
  if (qNorm) {
    out = out.filter((p) => {
      const name = (p.name ?? "").toLowerCase();
      const desc = (p.description ?? "").toLowerCase();
      return name.includes(qNorm) || desc.includes(qNorm);
    });
  }
  if (opts.status) {
    out = out.filter((p) => p.status === opts.status);
  }
  if (opts.tipo === "sem") {
    out = out.filter((p) => p.vc_process_type == null && !(p.vc_tipo_label?.trim()));
  } else if (opts.tipo === "primario" || opts.tipo === "apoio" || opts.tipo === "gerencial") {
    out = out.filter((p) => p.vc_process_type === opts.tipo);
  }
  const trimEq = (a: string | null | undefined, b: string) => {
    if (!b) return true;
    return (a ?? "").trim() === b.trim();
  };
  if (opts.n1) {
    out = out.filter((p) => trimEq(levelsFromRow(p as OfficeProcessLevelRow)[0] ?? null, opts.n1));
  }
  if (opts.n2) {
    out = out.filter((p) => trimEq(levelsFromRow(p as OfficeProcessLevelRow)[1] ?? null, opts.n2));
  }
  if (opts.n3) {
    out = out.filter((p) => trimEq(levelsFromRow(p as OfficeProcessLevelRow)[2] ?? null, opts.n3));
  }
  if (opts.faseFilter) {
    out = out.filter((p) => {
      const current = computeCurrentBpmPhaseSlug(p.office_process_bpm_phases ?? []);
      return current === opts.faseFilter;
    });
  }
  return out;
}
