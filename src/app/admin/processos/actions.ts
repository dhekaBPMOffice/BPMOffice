"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizeChecklist, slugifyProcessName } from "@/lib/processes";
import type { ProcessFlowchartFile, ProcessTemplateFile } from "@/types/database";
import { uploadProcessFile } from "@/lib/process-file-upload";

type SaveBaseProcessInput = {
  name: string;
  description?: string;
  category?: string;
  templateFiles?: ProcessTemplateFile[];
  flowchartFiles?: ProcessFlowchartFile[];
  managementChecklist?: string[];
  sortOrder?: number;
  isActive?: boolean;
};

/** Mensagem amigável quando ainda existem office_processes apontando para o catálogo (ON DELETE RESTRICT). */
const MSG_EXCLUSAO_BLOQUEADA_VINCULOS_ESCRITORIOS =
  "Não é possível excluir este processo do catálogo enquanto ele estiver atribuído a um ou mais escritórios. Remova o vínculo no escritório (processos do escritório) antes de excluir aqui.";

function mapDeleteBaseProcessError(raw: string | undefined): string {
  if (!raw) return "Não foi possível excluir o processo.";
  const lower = raw.toLowerCase();
  if (
    raw.includes("office_processes_base_process_id_fkey") ||
    (lower.includes("foreign key") && lower.includes("office_processes"))
  ) {
    return MSG_EXCLUSAO_BLOQUEADA_VINCULOS_ESCRITORIOS;
  }
  return raw;
}

async function buildUniqueSlug(baseName: string, currentId?: string) {
  const supabase = await createServiceClient();
  const baseSlug = slugifyProcessName(baseName);
  let slug = baseSlug || `processo-${Date.now()}`;
  let suffix = 1;

  while (true) {
    let query = supabase
      .from("base_processes")
      .select("id")
      .eq("slug", slug);

    if (currentId) {
      query = query.neq("id", currentId);
    }

    const { data } = await query.maybeSingle();
    if (!data) return slug;

    suffix += 1;
    slug = `${baseSlug || "processo"}-${suffix}`;
  }
}

export async function createBaseProcess(input: SaveBaseProcessInput) {
  if (!input.name?.trim()) {
    return { error: "Nome do processo é obrigatório." };
  }

  const supabase = await createServiceClient();
  const slug = await buildUniqueSlug(input.name);

  const { data, error } = await supabase
    .from("base_processes")
    .insert({
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      template_files: input.templateFiles ?? [],
      flowchart_files: input.flowchartFiles ?? [],
      management_checklist: normalizeChecklist(input.managementChecklist),
      sort_order: input.sortOrder ?? 0,
      is_active: input.isActive ?? true,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Não foi possível criar o processo." };
  }

  revalidatePath("/admin/processos");
  return { success: true, id: data.id };
}

export async function updateBaseProcess(id: string, input: SaveBaseProcessInput) {
  if (!input.name?.trim()) {
    return { error: "Nome do processo é obrigatório." };
  }

  const supabase = await createServiceClient();
  const slug = await buildUniqueSlug(input.name, id);

  const { error } = await supabase
    .from("base_processes")
    .update({
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      template_files: input.templateFiles ?? [],
      flowchart_files: input.flowchartFiles ?? [],
      management_checklist: normalizeChecklist(input.managementChecklist),
      sort_order: input.sortOrder ?? 0,
      is_active: input.isActive ?? true,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/processos");
  revalidatePath(`/admin/processos/${id}`);
  return { success: true };
}

export async function setBaseProcessActive(id: string, isActive: boolean) {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("base_processes").update({ is_active: isActive }).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/processos");
  revalidatePath(`/admin/processos/${id}`);
  return { success: true };
}

export async function deleteBaseProcess(id: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("base_processes").delete().eq("id", id);

  if (error) {
    return { error: mapDeleteBaseProcessError(error.message) };
  }

  revalidatePath("/admin/processos");
  return { success: true };
}

export async function deleteBaseProcesses(ids: string[]) {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return { error: "Nenhum processo selecionado." };
  }

  const supabase = await createServiceClient();
  const { error } = await supabase.from("base_processes").delete().in("id", unique);

  if (error) {
    return { error: mapDeleteBaseProcessError(error.message) };
  }

  revalidatePath("/admin/processos");
  return { success: true };
}

export async function uploadBaseProcessFile(formData: FormData) {
  const file = formData.get("file") as File | null;
  const baseProcessId = formData.get("baseProcessId") as string | null;
  const kind = (formData.get("kind") as "template" | "flowchart") || "template";

  if (!file?.size || !baseProcessId) {
    return { error: "Arquivo e ID do processo são obrigatórios." };
  }

  const supabase = await createServiceClient();
  const result = await uploadProcessFile(supabase, file, {
    type: "base_process",
    baseProcessId,
  }, kind);

  if ("error" in result) return result;
  return { success: true, url: result.url, filename: result.filename };
}
