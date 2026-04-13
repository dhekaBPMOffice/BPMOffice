"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { dbRowToProcessItem } from "@/lib/value-chain-mappers";
import type { ProcessItem } from "@/types/cadeia-valor";
import type { OfficeProcessBpmPhase } from "@/types/database";

export interface StrategicObjectiveProcessLink {
  id: string;
  office_id: string;
  objective_id: string;
  process_local_id: string;
  process_macroprocesso: string;
  process_nivel1: string | null;
  process_nivel2: string | null;
  process_nivel3: string | null;
  created_at: string;
}

export async function getStrategicAlignmentData(): Promise<{
  objectives: {
    id: string;
    title: string;
    description: string | null;
  }[];
  links: StrategicObjectiveProcessLink[];
  processes: ProcessItem[];
  error: string | null;
}> {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile.office_id) {
    return {
      objectives: [],
      links: [],
      processes: [],
      error: "Escritório não encontrado.",
    };
  }

  const officeId = profile.office_id;

  const [
    { data: objectivesData, error: objectivesError },
    { data: linksData, error: linksError },
    { data: processRows, error: processesError },
  ] = await Promise.all([
    supabase
      .from("strategic_objectives")
      .select("id, title, description")
      .eq("office_id", officeId)
      .order("created_at", { ascending: false }),
    supabase
      .from("strategic_objective_process_links")
      .select(
        "id, office_id, objective_id, process_local_id, process_macroprocesso, process_nivel1, process_nivel2, process_nivel3, created_at"
      )
      .eq("office_id", officeId)
      .order("created_at", { ascending: true }),
    supabase
      .from("office_processes")
      .select("*, office_process_bpm_phases (phase, stage_status)")
      .eq("office_id", officeId)
      .order("selected_at", { ascending: false }),
  ]);

  type RowWithPhases = Record<string, unknown> & {
    office_process_bpm_phases: OfficeProcessBpmPhase[] | null;
  };

  const processes: ProcessItem[] = (processRows ?? []).map((row) => {
    const r = row as RowWithPhases;
    return dbRowToProcessItem(r, r.office_process_bpm_phases ?? []);
  });

  if (objectivesError) {
    return {
      objectives: [],
      links: [],
      processes: [],
      error: objectivesError.message,
    };
  }

  if (linksError) {
    return {
      objectives: (objectivesData ?? []) as {
        id: string;
        title: string;
        description: string | null;
      }[],
      links: [],
      processes: processesError ? [] : processes,
      error: linksError.message,
    };
  }

  if (processesError) {
    return {
      objectives: (objectivesData ?? []) as {
        id: string;
        title: string;
        description: string | null;
      }[],
      links: (linksData ?? []) as StrategicObjectiveProcessLink[],
      processes: [],
      error: processesError.message,
    };
  }

  return {
    objectives: (objectivesData ?? []) as {
      id: string;
      title: string;
      description: string | null;
    }[],
    links: (linksData ?? []) as StrategicObjectiveProcessLink[],
    processes,
    error: null,
  };
}

export async function createStrategicObjectiveProcessLink(input: {
  objectiveId: string;
  process: {
    localId: string;
    macroprocesso: string;
    nivel1?: string;
    nivel2?: string;
    nivel3?: string;
  };
}): Promise<{ link: StrategicObjectiveProcessLink | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile.office_id) {
    return { link: null, error: "Escritório não encontrado." };
  }

  const payload = {
    office_id: profile.office_id,
    objective_id: input.objectiveId,
    process_local_id: input.process.localId,
    process_macroprocesso: input.process.macroprocesso || "Sem Macroprocesso",
    process_nivel1: input.process.nivel1 ?? null,
    process_nivel2: input.process.nivel2 ?? null,
    process_nivel3: input.process.nivel3 ?? null,
  };

  const { data, error } = await supabase
    .from("strategic_objective_process_links")
    .upsert(payload, {
      onConflict: "office_id,objective_id,process_local_id",
    })
    .select()
    .single();

  if (error) {
    return { link: null, error: error.message };
  }

  await logAudit({
    office_id: profile.office_id,
    user_id: profile.id,
    action: "create",
    resource_type: "strategic_objective_process_link",
    resource_id: data.id,
    details: {
      objective_id: input.objectiveId,
      process_local_id: input.process.localId,
    },
  });

  return { link: data as StrategicObjectiveProcessLink, error: null };
}

export async function deleteStrategicObjectiveProcessLink(input: {
  objectiveId: string;
  processLocalId: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile.office_id) {
    return { error: "Escritório não encontrado." };
  }

  const { error } = await supabase
    .from("strategic_objective_process_links")
    .delete()
    .eq("office_id", profile.office_id)
    .eq("objective_id", input.objectiveId)
    .eq("process_local_id", input.processLocalId);

  if (error) {
    return { error: error.message };
  }

  await logAudit({
    office_id: profile.office_id,
    user_id: profile.id,
    action: "delete",
    resource_type: "strategic_objective_process_link",
    resource_id: `${input.objectiveId}:${input.processLocalId}`,
    details: {},
  });

  return { error: null };
}

