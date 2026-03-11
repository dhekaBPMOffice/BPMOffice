"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type KnowledgeCategory =
  | "communication_plan"
  | "event"
  | "activity"
  | "best_practice"
  | "training_material"
  | "lecture"
  | "document_template"
  | "prompt_template";

export interface KnowledgeItem {
  id: string;
  office_id: string;
  category: KnowledgeCategory;
  title: string;
  description: string | null;
  content: string | null;
  file_url: string | null;
  source_type: string | null;
  source_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export async function getKnowledgeItems(
  category?: KnowledgeCategory
): Promise<{ data: KnowledgeItem[] | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  let query = supabase
    .from("knowledge_base")
    .select("*")
    .eq("office_id", profile.office_id)
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as KnowledgeItem[], error: null };
}

export async function createKnowledgeItem(input: {
  category: KnowledgeCategory;
  title: string;
  description?: string;
  content?: string;
  file_url?: string;
  source_type?: string;
  source_id?: string;
}): Promise<{ data: KnowledgeItem | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  const { data, error } = await supabase
    .from("knowledge_base")
    .insert({
      office_id: profile.office_id,
      category: input.category,
      title: input.title,
      description: input.description || null,
      content: input.content || null,
      file_url: input.file_url || null,
      source_type: input.source_type || null,
      source_id: input.source_id || null,
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  await logAudit({
    office_id: profile.office_id,
    user_id: profile.id,
    action: "create",
    resource_type: "knowledge_base",
    resource_id: data.id,
    details: { category: input.category, title: input.title },
  });

  revalidatePath("/escritorio/conhecimento");
  return { data: data as KnowledgeItem, error: null };
}

export async function updateKnowledgeItem(
  id: string,
  input: {
    title?: string;
    description?: string;
    content?: string;
    file_url?: string;
    source_type?: string;
    source_id?: string;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const { error } = await supabase
    .from("knowledge_base")
    .update(input)
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  revalidatePath("/escritorio/conhecimento");
  return { error: null };
}

export async function deleteKnowledgeItem(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const { error } = await supabase
    .from("knowledge_base")
    .delete()
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  await logAudit({
    office_id: profile.office_id,
    user_id: profile.id,
    action: "delete",
    resource_type: "knowledge_base",
    resource_id: id,
    details: {},
  });

  revalidatePath("/escritorio/conhecimento");
  return { error: null };
}
