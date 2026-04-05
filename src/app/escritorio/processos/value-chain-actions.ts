"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { bpmStageLabelToDb, labelToBpmPhaseSlug, type BpmPhaseSlug } from "@/lib/bpm-phases";
import {
  assertStage,
  deriveVcProcessTypeFromLabel,
  processItemToPayload,
  type ValueChainProcessPayload,
} from "@/lib/value-chain-mappers";
import type { ProcessItem } from "@/types/cadeia-valor";

async function assertLeader() {
  const profile = await getProfile();
  if (profile.role !== "leader" || !profile.office_id) {
    return { error: "Apenas líderes podem executar esta ação." as const };
  }
  return { profile };
}

export async function saveValueChainOfficeProcess(payload: ValueChainProcessPayload) {
  const access = await assertLeader();
  if ("error" in access) return { error: access.error };

  const { profile } = access;
  const supabase = await createServiceClient();
  const now = new Date().toISOString();

  const baseRow = {
    office_id: profile.office_id,
    name: payload.macroprocesso?.trim() || payload.nivel1?.trim() || "Processo",
    description: null as string | null,
    category: null as string | null,
    vc_tipo_label: payload.tipo.trim() || null,
    vc_process_type: deriveVcProcessTypeFromLabel(payload.tipo),
    vc_macroprocesso: payload.macroprocesso?.trim() || null,
    vc_level1: payload.nivel1?.trim() || null,
    vc_level2: payload.nivel2?.trim() || null,
    vc_level3: payload.nivel3?.trim() || null,
    vc_priority: payload.prioridade,
    vc_gestor_label: payload.gestorProcesso?.trim() || null,
    vc_general_status: payload.statusGeral,
    value_chain_id: payload.valueChainId ?? null,
    updated_at: now,
  };

  let officeProcessId = payload.id;

  const { data: existingRow } = officeProcessId
    ? await supabase
        .from("office_processes")
        .select("id")
        .eq("id", officeProcessId)
        .eq("office_id", profile.office_id)
        .maybeSingle()
    : { data: null };

  if (officeProcessId && existingRow) {
    const { error: upErr } = await supabase.from("office_processes").update(baseRow).eq("id", officeProcessId);
    if (upErr) return { error: upErr.message };
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from("office_processes")
      .insert({
        ...(officeProcessId && !existingRow ? { id: officeProcessId } : {}),
        ...baseRow,
        base_process_id: null,
        creation_source: "created_in_value_chain",
        origin: "value_chain",
        status: "not_started",
        template_files: [],
        flowchart_files: [],
        added_by_profile_id: profile.id,
      })
      .select("id")
      .single();

    if (insErr || !inserted) {
      return { error: insErr?.message ?? "Não foi possível criar o processo." };
    }
    officeProcessId = inserted.id;
  }

  if (!officeProcessId) return { error: "ID inválido." };

  const phaseUpdates = Object.entries(payload.etapas)
    .filter(([k]) => assertStage(k))
    .map(([stageLabel, statusLabel]) => {
      const slug = labelToBpmPhaseSlug(stageLabel);
      if (!slug) return null;
      const stage_status = bpmStageLabelToDb(statusLabel);
      const completed_at = stage_status === "completed" ? now : null;
      return {
        office_process_id: officeProcessId,
        phase: slug,
        stage_status,
        completed_at,
        updated_at: now,
      };
    })
    .filter(Boolean) as Array<{
    office_process_id: string;
    phase: BpmPhaseSlug;
    stage_status: string;
    completed_at: string | null;
    updated_at: string;
  }>;

  for (const u of phaseUpdates) {
    const { error: phErr } = await supabase
      .from("office_process_bpm_phases")
      .update({
        stage_status: u.stage_status,
        completed_at: u.completed_at,
        updated_at: u.updated_at,
      })
      .eq("office_process_id", officeProcessId)
      .eq("phase", u.phase);
    if (phErr) return { error: phErr.message };
  }

  revalidatePath("/escritorio/estrategia/cadeia-valor");
  revalidatePath("/escritorio/processos");
  revalidatePath(`/escritorio/processos/${officeProcessId}`);
  return { success: true, id: officeProcessId };
}

/** Mesma regra da query em cadeia-valor/page.tsx: o processo aparece na lista se qualquer condição for verdadeira. */
function rowAppearsOnValueChainPage(row: {
  creation_source: string | null;
  value_chain_id: string | null;
  vc_macroprocesso: string | null;
}): boolean {
  if (row.value_chain_id) return true;
  const macro = row.vc_macroprocesso?.trim();
  if (macro) return true;
  return row.creation_source === "created_in_value_chain";
}

type DeleteVcRowOutcome =
  | { kind: "ok" }
  | { kind: "missing" }
  | { kind: "not_in_vc" }
  | { kind: "db_error"; message: string };

async function deleteOneValueChainOfficeRow(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  officeId: string,
  officeProcessId: string,
  now: string
): Promise<DeleteVcRowOutcome> {
  const { data: row, error: fetchErr } = await supabase
    .from("office_processes")
    .select("id, creation_source, value_chain_id, vc_macroprocesso")
    .eq("id", officeProcessId)
    .eq("office_id", officeId)
    .maybeSingle();

  if (fetchErr) return { kind: "db_error", message: fetchErr.message };
  if (!row) return { kind: "missing" };
  if (!rowAppearsOnValueChainPage(row)) return { kind: "not_in_vc" };

  if (row.creation_source === "created_in_value_chain") {
    const { error } = await supabase.from("office_processes").delete().eq("id", officeProcessId);
    if (error) return { kind: "db_error", message: error.message };
  } else {
    const { error } = await supabase
      .from("office_processes")
      .update({
        value_chain_id: null,
        vc_macroprocesso: null,
        vc_level1: null,
        vc_level2: null,
        vc_level3: null,
        vc_tipo_label: null,
        vc_process_type: null,
        vc_priority: null,
        vc_gestor_label: null,
        vc_general_status: null,
        updated_at: now,
      })
      .eq("id", officeProcessId)
      .eq("office_id", officeId);
    if (error) return { kind: "db_error", message: error.message };
  }

  return { kind: "ok" };
}

function revalidateValueChainPaths() {
  revalidatePath("/escritorio/estrategia/cadeia-valor");
  revalidatePath("/escritorio/processos");
}

/** Uma ida ao servidor: evita várias chamadas paralelas (Promise.all) que podem travar ou demorar demais no cliente. */
export async function deleteValueChainOfficeProcesses(ids: string[]) {
  const access = await assertLeader();
  if ("error" in access) return { error: access.error };

  const { profile } = access;
  const officeId = profile.office_id;
  if (!officeId) return { error: "Escritório não encontrado." };

  const supabase = await createServiceClient();
  const now = new Date().toISOString();
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];

  for (const officeProcessId of unique) {
    const out = await deleteOneValueChainOfficeRow(supabase, officeId, officeProcessId, now);
    if (out.kind === "db_error") return { error: out.message };
  }

  revalidateValueChainPaths();
  return { success: true as const };
}

export async function deleteValueChainOfficeProcess(officeProcessId: string) {
  const access = await assertLeader();
  if ("error" in access) return { error: access.error };

  const { profile } = access;
  const officeId = profile.office_id;
  if (!officeId) return { error: "Escritório não encontrado." };

  const supabase = await createServiceClient();
  const now = new Date().toISOString();

  const out = await deleteOneValueChainOfficeRow(supabase, officeId, officeProcessId, now);
  if (out.kind === "missing") return { error: "Processo não encontrado." };
  if (out.kind === "not_in_vc") return { error: "Este processo não está na Cadeia de Valor." };
  if (out.kind === "db_error") return { error: out.message };

  revalidateValueChainPaths();
  return { success: true };
}

export async function syncAllValueChainProcesses(items: ProcessItem[]) {
  const access = await assertLeader();
  if ("error" in access) return { error: access.error };

  for (const item of items) {
    const res = await saveValueChainOfficeProcess(processItemToPayload(item));
    if ("error" in res) return { error: res.error };
  }

  revalidatePath("/escritorio/estrategia/cadeia-valor");
  revalidatePath("/escritorio/processos");
  return { success: true as const };
}

export async function importCadeiaValorFromLocalStorageJson(json: string) {
  const access = await assertLeader();
  if ("error" in access) return { error: access.error };

  let items: ValueChainProcessPayload[];
  try {
    items = JSON.parse(json) as ValueChainProcessPayload[];
    if (!Array.isArray(items)) throw new Error("invalid");
  } catch {
    return { error: "JSON inválido." };
  }

  let imported = 0;
  for (const raw of items) {
    if (!raw.etapas || !raw.tipo) continue;
    const res = await saveValueChainOfficeProcess({
      ...raw,
      id: undefined,
    });
    if (!("error" in res)) imported += 1;
  }

  revalidatePath("/escritorio/estrategia/cadeia-valor");
  revalidatePath("/escritorio/processos");
  return { success: true, imported };
}
