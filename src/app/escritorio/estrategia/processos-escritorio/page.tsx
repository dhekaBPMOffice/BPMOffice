import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OFFICE_PROCESS_STATUS_META } from "@/lib/processes";
import {
  formatCurrentBpmPhaseLabel,
  computeCurrentBpmPhaseSlug,
} from "@/lib/bpm-phases";
import { formatVcProcessTypeLabel } from "@/lib/office-processes-list";
import {
  formatNivelLabelFromLevels,
  levelsFromRow,
  type OfficeProcessLevelRow,
} from "@/lib/office-process-levels";
import { ProcessosEscritorioClient } from "./processos-escritorio-client";
import type { GestaoProcessItem } from "../cadeia-valor/gestao-processos-tab";
import type { OfficeProcessBpmPhase, OfficeProcessStatus } from "@/types/database";

export type CatalogoItem = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  flowchartFiles: { url: string }[];
  templateFiles: { url: string; label?: string | null }[];
};

export default async function ProcessosEscritorioPage() {
  const profile = await requireRole(["leader"]);
  const supabase = await createClient();

  if (!profile.office_id) {
    return (
      <div className="p-6 text-destructive">
        Escritório não encontrado.
      </div>
    );
  }

  const [{ data: processData }, { data: baseProcesses }, { data: allOfficeProcesses }] =
    await Promise.all([
      supabase
        .from("office_processes")
        .select(
          `*, owner_profile:owner_profile_id (id, full_name), office_process_bpm_phases (phase, stage_status)`
        )
        .eq("office_id", profile.office_id)
        // Formulário de ativação e adições pelo catálogo gravam creation_source = from_catalog;
        // origin manual + from_catalog não era incluído quando só filtrávamos origin = questionnaire.
        .eq("creation_source", "from_catalog")
        .order("selected_at", { ascending: false }),
      supabase
        .from("base_processes")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("office_processes")
        .select("base_process_id")
        .eq("office_id", profile.office_id),
    ]);

  type RowWithRelations = Record<string, unknown> & {
    owner_profile?: { full_name?: string } | null;
    office_process_bpm_phases: Array<{ phase: string; stage_status: string }> | null;
  };

  const rows = (processData ?? []) as RowWithRelations[];

  const gestaoItems: GestaoProcessItem[] = rows.map((p) => {
    const statusMeta =
      OFFICE_PROCESS_STATUS_META[p.status as OfficeProcessStatus] ??
      OFFICE_PROCESS_STATUS_META.not_started;
    const owner = p.owner_profile as { full_name?: string } | null;
    const phases = p.office_process_bpm_phases ?? [];
    const faseBpmLabel = formatCurrentBpmPhaseLabel(phases);
    const faseBpmSlug = computeCurrentBpmPhaseSlug(phases);
    const vcLevels = levelsFromRow(p as OfficeProcessLevelRow);
    const nivelLabel = formatNivelLabelFromLevels(vcLevels);
    const tipoLabel = formatVcProcessTypeLabel(
      p.vc_process_type as string | null,
      p.vc_tipo_label as string | null
    );
    const origemLabel =
      p.creation_source === "created_in_value_chain" ? "Criado na cadeia" : "Catálogo";
    const originDetailLabel =
      p.origin === "questionnaire"
        ? "Formulário de ativação"
        : p.creation_source === "from_catalog"
          ? "Catálogo (manual)"
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
      vcLevels,
      flowcharts,
      templates,
    };
  });

  const totalAll = gestaoItems.length;
  const completed = gestaoItems.filter((i) => i.statusRaw === "completed").length;
  const inProgress = gestaoItems.filter((i) => i.statusRaw === "in_progress").length;

  const selectedBaseIds = new Set(
    (allOfficeProcesses ?? [])
      .map((item) => item.base_process_id)
      .filter((id): id is string => id != null)
  );

  const catalogItems: CatalogoItem[] = (baseProcesses ?? [])
    .filter((bp) => !selectedBaseIds.has(bp.id))
    .map((bp) => {
      const flowchartFiles =
        Array.isArray(bp.flowchart_files) && bp.flowchart_files.length > 0
          ? (bp.flowchart_files as { url: string }[])
          : bp.flowchart_image_url
            ? [{ url: bp.flowchart_image_url }]
            : [];
      const templateFiles =
        Array.isArray(bp.template_files) && bp.template_files.length > 0
          ? (bp.template_files as { url: string; label?: string | null }[])
          : bp.template_url
            ? [{ url: bp.template_url, label: bp.template_label }]
            : [];

      return {
        id: bp.id,
        name: bp.name,
        category: bp.category,
        description: bp.description,
        flowchartFiles,
        templateFiles,
      };
    });

  return (
    <ProcessosEscritorioClient
      gestaoProps={{
        items: gestaoItems,
        stats: { total: totalAll, inProgress, completed },
      }}
      catalogItems={catalogItems}
    />
  );
}
