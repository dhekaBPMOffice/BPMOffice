"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function getDemandPath(demandId: string) {
  return `/escritorio/demandas/${demandId}`;
}

export async function getProjectByDemand(demandId: string) {
  const profile = await getProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bpm_projects")
    .select("*")
    .eq("demand_id", demandId)
    .eq("office_id", profile.office_id ?? "")
    .single();

  if (error && error.code !== "PGRST116") return { data: null, error: error.message };
  return { data };
}

export async function savePlanningData(
  demandId: string,
  data: {
    scope?: string;
    estimates?: string;
    project_plan?: string;
    schedule?: Record<string, unknown> | unknown[];
  }
) {
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("bpm_projects")
    .select("id")
    .eq("demand_id", demandId)
    .eq("office_id", profile.office_id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("bpm_projects")
      .update({
        scope: data.scope ?? null,
        estimates: data.estimates ?? null,
        project_plan: data.project_plan ?? null,
        schedule: data.schedule ?? null,
      })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("bpm_projects").insert({
      demand_id: demandId,
      office_id: profile.office_id,
      scope: data.scope ?? null,
      estimates: data.estimates ?? null,
      project_plan: data.project_plan ?? null,
      schedule: data.schedule ?? null,
    });

    if (error) return { error: error.message };
  }

  revalidatePath(getDemandPath(demandId));
  return { success: true };
}

export async function createSurveyScript(
  demandId: string,
  title: string,
  questions: unknown[]
) {
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const supabase = await createClient();

  let { data: project } = await supabase
    .from("bpm_projects")
    .select("id")
    .eq("demand_id", demandId)
    .eq("office_id", profile.office_id)
    .single();

  if (!project) {
    const { data: newProject, error: insertErr } = await supabase
      .from("bpm_projects")
      .insert({
        demand_id: demandId,
        office_id: profile.office_id,
      })
      .select("id")
      .single();
    if (insertErr || !newProject) return { error: insertErr?.message ?? "Erro ao criar projeto." };
    project = newProject;
  }

  const { data, error } = await supabase
    .from("survey_scripts")
    .insert({
      project_id: project.id,
      office_id: profile.office_id,
      title,
      questions: questions ?? [],
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath(getDemandPath(demandId));
  return { success: true, id: data.id };
}

export async function getSurveyScripts(demandId: string) {
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("bpm_projects")
    .select("id")
    .eq("demand_id", demandId)
    .eq("office_id", profile.office_id ?? "")
    .single();

  if (!project) return { data: [] };

  const { data, error } = await supabase
    .from("survey_scripts")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  if (error) return { data: [] };
  return { data: data ?? [] };
}

export async function saveSurveyResponse(
  scriptId: string,
  data: { respondent?: string; answers?: Record<string, unknown>; transcription?: string }
) {
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const supabase = await createClient();

  const { data: script } = await supabase
    .from("survey_scripts")
    .select("office_id")
    .eq("id", scriptId)
    .single();

  if (!script || script.office_id !== profile.office_id) {
    return { error: "Script não encontrado." };
  }

  const { error } = await supabase.from("survey_responses").insert({
    script_id: scriptId,
    office_id: profile.office_id,
    respondent: data.respondent ?? null,
    answers: data.answers ?? {},
    transcription: data.transcription ?? null,
  });

  if (error) return { error: error.message };
  revalidatePath("/escritorio/demandas");
  return { success: true };
}

export async function getSurveyResponses(scriptId: string) {
  const profile = await getProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("survey_responses")
    .select("*")
    .eq("script_id", scriptId)
    .eq("office_id", profile.office_id ?? "")
    .order("created_at", { ascending: false });

  if (error) return { data: [] };
  return { data: data ?? [] };
}

export async function saveProcessModel(
  demandId: string,
  data: {
    name: string;
    bpmn_file_url?: string;
    png_file_url?: string;
    description?: string;
    procedures?: string;
    model_type: "as_is" | "to_be";
    version?: number;
  }
) {
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const supabase = await createClient();

  let { data: project } = await supabase
    .from("bpm_projects")
    .select("id")
    .eq("demand_id", demandId)
    .eq("office_id", profile.office_id)
    .single();

  if (!project) {
    const { data: newProject, error: insertErr } = await supabase
      .from("bpm_projects")
      .insert({
        demand_id: demandId,
        office_id: profile.office_id,
      })
      .select("id")
      .single();
    if (insertErr || !newProject) return { error: insertErr?.message ?? "Erro ao criar projeto." };
    project = newProject;
  }

  const { error } = await supabase.from("process_models").insert({
    project_id: project.id,
    office_id: profile.office_id,
    name: data.name,
    bpmn_file_url: data.bpmn_file_url ?? null,
    png_file_url: data.png_file_url ?? null,
    description: data.description ?? null,
    procedures: data.procedures ?? null,
    version: data.version ?? 1,
    model_type: data.model_type,
  });

  if (error) return { error: error.message };
  revalidatePath(getDemandPath(demandId));
  return { success: true };
}

export async function getProcessModels(demandId: string) {
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("bpm_projects")
    .select("id")
    .eq("demand_id", demandId)
    .eq("office_id", profile.office_id ?? "")
    .single();

  if (!project) return { data: [] };

  const { data, error } = await supabase
    .from("process_models")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  if (error) return { data: [] };
  return { data: data ?? [] };
}

export async function saveAnalysis(
  demandId: string,
  data: {
    technique?: string;
    strengths?: unknown[];
    weaknesses?: unknown[];
    criticality_level?: "baixa" | "media" | "alta" | "critica";
    recommendations?: string;
  }
) {
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const supabase = await createClient();

  let { data: project } = await supabase
    .from("bpm_projects")
    .select("id")
    .eq("demand_id", demandId)
    .eq("office_id", profile.office_id)
    .single();

  if (!project) {
    const { data: newProject, error: insertErr } = await supabase
      .from("bpm_projects")
      .insert({
        demand_id: demandId,
        office_id: profile.office_id,
      })
      .select("id")
      .single();
    if (insertErr || !newProject) return { error: insertErr?.message ?? "Erro ao criar projeto." };
    project = newProject;
  }

  const { data: existing } = await supabase
    .from("analysis_results")
    .select("id")
    .eq("project_id", project.id)
    .limit(1)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("analysis_results")
      .update({
        technique: data.technique ?? null,
        strengths: data.strengths ?? [],
        weaknesses: data.weaknesses ?? [],
        criticality_level: data.criticality_level ?? null,
        recommendations: data.recommendations ?? null,
      })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("analysis_results").insert({
      project_id: project.id,
      office_id: profile.office_id,
      technique: data.technique ?? null,
      strengths: data.strengths ?? [],
      weaknesses: data.weaknesses ?? [],
      criticality_level: data.criticality_level ?? null,
      recommendations: data.recommendations ?? null,
    });

    if (error) return { error: error.message };
  }

  revalidatePath(getDemandPath(demandId));
  return { success: true };
}

export async function getAnalysis(demandId: string) {
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("bpm_projects")
    .select("id")
    .eq("demand_id", demandId)
    .eq("office_id", profile.office_id ?? "")
    .single();

  if (!project) return { data: null };

  const { data, error } = await supabase
    .from("analysis_results")
    .select("*")
    .eq("project_id", project.id)
    .single();

  if (error || !data) return { data: null };
  return { data };
}

export async function saveImprovements(
  demandId: string,
  data: {
    technique?: string;
    suggestions?: unknown[];
    prioritization?: Record<string, unknown>;
    roadmap?: unknown[];
    associated_problems?: string;
  }
) {
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const supabase = await createClient();

  let { data: project } = await supabase
    .from("bpm_projects")
    .select("id")
    .eq("demand_id", demandId)
    .eq("office_id", profile.office_id)
    .single();

  if (!project) {
    const { data: newProject, error: insertErr } = await supabase
      .from("bpm_projects")
      .insert({
        demand_id: demandId,
        office_id: profile.office_id,
      })
      .select("id")
      .single();
    if (insertErr || !newProject) return { error: insertErr?.message ?? "Erro ao criar projeto." };
    project = newProject;
  }

  const { data: existing } = await supabase
    .from("improvements")
    .select("id")
    .eq("project_id", project.id)
    .limit(1)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("improvements")
      .update({
        technique: data.technique ?? null,
        suggestions: data.suggestions ?? [],
        prioritization: data.prioritization ?? {},
        roadmap: data.roadmap ?? [],
        associated_problems: data.associated_problems ?? null,
      })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("improvements").insert({
      project_id: project.id,
      office_id: profile.office_id,
      technique: data.technique ?? null,
      suggestions: data.suggestions ?? [],
      prioritization: data.prioritization ?? {},
      roadmap: data.roadmap ?? [],
      associated_problems: data.associated_problems ?? null,
    });

    if (error) return { error: error.message };
  }

  revalidatePath(getDemandPath(demandId));
  return { success: true };
}

export async function getImprovements(demandId: string) {
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("bpm_projects")
    .select("id")
    .eq("demand_id", demandId)
    .eq("office_id", profile.office_id ?? "")
    .single();

  if (!project) return { data: null };

  const { data, error } = await supabase
    .from("improvements")
    .select("*")
    .eq("project_id", project.id)
    .single();

  if (error || !data) return { data: null };
  return { data };
}

export async function saveImplementation(
  demandId: string,
  data: {
    plan_fields?: Record<string, unknown>;
    observations?: string;
    status?: string;
    progress?: Record<string, unknown>;
    report?: string;
  }
) {
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const supabase = await createClient();

  let { data: project } = await supabase
    .from("bpm_projects")
    .select("id")
    .eq("demand_id", demandId)
    .eq("office_id", profile.office_id)
    .single();

  if (!project) {
    const { data: newProject, error: insertErr } = await supabase
      .from("bpm_projects")
      .insert({
        demand_id: demandId,
        office_id: profile.office_id,
      })
      .select("id")
      .single();
    if (insertErr || !newProject) return { error: insertErr?.message ?? "Erro ao criar projeto." };
    project = newProject;
  }

  const { data: existing } = await supabase
    .from("implementation_plans")
    .select("id")
    .eq("project_id", project.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("implementation_plans")
      .update({
        plan_fields: data.plan_fields ?? {},
        observations: data.observations ?? null,
        status: data.status ?? "planning",
        progress: data.progress ?? {},
        report: data.report ?? null,
      })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("implementation_plans").insert({
      project_id: project.id,
      office_id: profile.office_id,
      plan_fields: data.plan_fields ?? {},
      observations: data.observations ?? null,
      status: data.status ?? "planning",
      progress: data.progress ?? {},
      report: data.report ?? null,
    });

    if (error) return { error: error.message };
  }

  revalidatePath(getDemandPath(demandId));
  return { success: true };
}

export async function getImplementation(demandId: string) {
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("bpm_projects")
    .select("id")
    .eq("demand_id", demandId)
    .eq("office_id", profile.office_id ?? "")
    .single();

  if (!project) return { data: null };

  const { data, error } = await supabase
    .from("implementation_plans")
    .select("*")
    .eq("project_id", project.id)
    .single();

  if (error || !data) return { data: null };
  return { data };
}

export async function saveClosure(
  demandId: string,
  data: {
    checklist?: unknown[];
    presentation_content?: string;
    final_report?: string;
    status?: string;
  }
) {
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const supabase = await createClient();

  let { data: project } = await supabase
    .from("bpm_projects")
    .select("id")
    .eq("demand_id", demandId)
    .eq("office_id", profile.office_id)
    .single();

  if (!project) {
    const { data: newProject, error: insertErr } = await supabase
      .from("bpm_projects")
      .insert({
        demand_id: demandId,
        office_id: profile.office_id,
      })
      .select("id")
      .single();
    if (insertErr || !newProject) return { error: insertErr?.message ?? "Erro ao criar projeto." };
    project = newProject;
  }

  const { data: existing } = await supabase
    .from("closures")
    .select("id")
    .eq("project_id", project.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("closures")
      .update({
        checklist: data.checklist ?? [],
        presentation_content: data.presentation_content ?? null,
        final_report: data.final_report ?? null,
        status: data.status ?? "pending",
      })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("closures").insert({
      project_id: project.id,
      office_id: profile.office_id,
      checklist: data.checklist ?? [],
      presentation_content: data.presentation_content ?? null,
      final_report: data.final_report ?? null,
      status: data.status ?? "pending",
    });

    if (error) return { error: error.message };
  }

  revalidatePath(getDemandPath(demandId));
  return { success: true };
}

export async function getClosure(demandId: string) {
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("bpm_projects")
    .select("id")
    .eq("demand_id", demandId)
    .eq("office_id", profile.office_id ?? "")
    .single();

  if (!project) return { data: null };

  const { data, error } = await supabase
    .from("closures")
    .select("*")
    .eq("project_id", project.id)
    .single();

  if (error || !data) return { data: null };
  return { data };
}
