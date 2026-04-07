import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbRowToProcessItem } from "@/lib/value-chain-mappers";
import { OFFICE_PROCESS_STATUS_META } from "@/lib/processes";
import {
  formatCurrentBpmPhaseLabel,
  computeCurrentBpmPhaseSlug,
} from "@/lib/bpm-phases";
import { formatVcProcessTypeLabel } from "@/lib/office-processes-list";
import { CadeiaValorTabs } from "./cadeia-valor-tabs";
import type { GestaoProcessItem } from "./gestao-processos-tab";
import type { OfficeProcessBpmPhase, OfficeProcessStatus } from "@/types/database";

export default async function CadeiaValorPage() {
  const profile = await requireRole(["leader"]);
  const supabase = await createClient();

  if (!profile.office_id) {
    return (
      <div className="p-6 text-destructive">
        Escritório não encontrado.
      </div>
    );
  }

  const [{ data: cadeiaData }, { data: allData }] = await Promise.all([
    supabase
      .from("office_processes")
      .select("*, office_process_bpm_phases (*)")
      .eq("office_id", profile.office_id)
      .or(
        "value_chain_id.not.is.null,vc_macroprocesso.not.is.null,creation_source.eq.created_in_value_chain"
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("office_processes")
      .select(
        `*, owner_profile:owner_profile_id (id, full_name), office_process_bpm_phases (phase, stage_status)`
      )
      .eq("office_id", profile.office_id)
      .or(
        "value_chain_id.not.is.null,vc_macroprocesso.not.is.null,creation_source.eq.created_in_value_chain"
      )
      .order("selected_at", { ascending: false }),
  ]);

  type RowWithPhases = Record<string, unknown> & {
    office_process_bpm_phases: OfficeProcessBpmPhase[] | null;
  };

  const cadeiaRows = (cadeiaData ?? []) as RowWithPhases[];
  const cadeiaProcesses = cadeiaRows.map((row) =>
    dbRowToProcessItem(row, row.office_process_bpm_phases ?? [])
  );
  const processListKey = cadeiaRows
    .map((r) => r.id as string)
    .sort()
    .join("|");

  const allRows = (allData ?? []) as Array<
    Record<string, unknown> & {
      owner_profile?: { full_name?: string } | null;
      office_process_bpm_phases: Array<{ phase: string; stage_status: string }> | null;
    }
  >;

  const gestaoItems: GestaoProcessItem[] = allRows.map((p) => {
    const statusMeta =
      OFFICE_PROCESS_STATUS_META[p.status as OfficeProcessStatus] ??
      OFFICE_PROCESS_STATUS_META.not_started;
    const owner = p.owner_profile as { full_name?: string } | null;
    const phases = p.office_process_bpm_phases ?? [];
    const faseBpmLabel = formatCurrentBpmPhaseLabel(phases);
    const faseBpmSlug = computeCurrentBpmPhaseSlug(phases);
    const nivelParts = [p.vc_level1 as string | null, p.vc_level2 as string | null, p.vc_level3 as string | null]
      .map((x) => x?.trim())
      .filter(Boolean) as string[];
    const nivelLabel = nivelParts.length ? nivelParts.join(" › ") : null;
    const tipoLabel = formatVcProcessTypeLabel(
      p.vc_process_type as string | null,
      p.vc_tipo_label as string | null
    );
    const origemLabel =
      p.creation_source === "created_in_value_chain" ? "Criado na cadeia" : "Catálogo";
    const originDetailLabel =
      p.origin === "questionnaire"
        ? "Automática"
        : p.origin === "value_chain"
          ? "Cadeia de valor"
          : "Manual";

    const flowcharts =
      Array.isArray(p.flowchart_files) && (p.flowchart_files as unknown[]).length > 0
        ? (p.flowchart_files as { url: string }[])
        : p.flowchart_image_url
          ? [{ url: p.flowchart_image_url as string }]
          : [];
    const templates =
      Array.isArray(p.template_files) && (p.template_files as unknown[]).length > 0
        ? (p.template_files as { url: string; label?: string | null }[])
        : p.template_url
          ? [{ url: p.template_url as string, label: p.template_label as string | null }]
          : [];

    return {
      id: p.id as string,
      name: p.name as string,
      category: (p.category as string | null) ?? null,
      description: (p.description as string | null) ?? null,
      statusLabel: statusMeta.label,
      statusRaw: p.status as string,
      statusVariant: statusMeta.variant,
      origemLabel,
      originDetailLabel,
      faseBpmLabel,
      faseBpmSlug,
      tipoLabel,
      nivelLabel,
      ownerName: owner?.full_name ?? null,
      vcProcessType: (p.vc_process_type as string | null) ?? null,
      vcLevel1: (p.vc_level1 as string | null) ?? null,
      vcLevel2: (p.vc_level2 as string | null) ?? null,
      vcLevel3: (p.vc_level3 as string | null) ?? null,
      flowcharts,
      templates,
    };
  });

  const totalAll = gestaoItems.length;
  const completed = gestaoItems.filter((i) => i.statusRaw === "completed").length;
  const inProgress = gestaoItems.filter((i) => i.statusRaw === "in_progress").length;

  const hasProcesses = cadeiaProcesses.length > 0;
  const initialTab = hasProcesses ? "gestao" : "configuracao";

  return (
    <CadeiaValorTabs
      initialTab={initialTab}
      cadeiaProcesses={cadeiaProcesses}
      processListKey={processListKey}
      gestaoProps={{
        items: gestaoItems,
        stats: { total: totalAll, inProgress, completed },
      }}
    />
  );
}
