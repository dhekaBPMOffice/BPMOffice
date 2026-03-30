"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  DocumentTemplateStyles,
  DocumentSectionConfig,
  BrandingMapping,
} from "@/types/database";

const REVALIDATE = "/admin/modelos-documento";

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function listTemplates() {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("document_templates")
    .select("*")
    .order("is_default", { ascending: false })
    .order("name");
  if (error) return { error: error.message, data: [] as never[] };
  return { data };
}

export async function saveTemplate(payload: {
  id?: string;
  name: string;
  description?: string | null;
  styles: DocumentTemplateStyles;
  is_default?: boolean;
}) {
  const supabase = await createServiceClient();

  if (payload.is_default) {
    await supabase
      .from("document_templates")
      .update({ is_default: false })
      .neq("id", payload.id ?? "");
  }

  if (payload.id) {
    const { error } = await supabase
      .from("document_templates")
      .update({
        name: payload.name,
        description: payload.description ?? null,
        styles: payload.styles as unknown as Record<string, unknown>,
        is_default: payload.is_default ?? false,
      })
      .eq("id", payload.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("document_templates").insert({
      name: payload.name,
      description: payload.description ?? null,
      styles: payload.styles as unknown as Record<string, unknown>,
      is_default: payload.is_default ?? false,
    });
    if (error) return { error: error.message };
  }

  revalidatePath(REVALIDATE);
  return { success: true };
}

export async function deleteTemplate(id: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("document_templates").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(REVALIDATE);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Type configs
// ---------------------------------------------------------------------------

export async function listTypeConfigs() {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("document_type_configs")
    .select("*")
    .order("label");
  if (error) return { error: error.message, data: [] as never[] };
  return { data };
}

export async function saveTypeConfig(payload: {
  id: string;
  template_id: string | null;
  style_overrides: Partial<DocumentTemplateStyles>;
  sections: DocumentSectionConfig[];
  branding_mapping: BrandingMapping;
}) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("document_type_configs")
    .update({
      template_id: payload.template_id,
      style_overrides: payload.style_overrides as unknown as Record<string, unknown>,
      sections: payload.sections as unknown as Record<string, unknown>[],
      branding_mapping: payload.branding_mapping as unknown as Record<string, unknown>,
    })
    .eq("id", payload.id);
  if (error) return { error: error.message };
  revalidatePath(REVALIDATE);
  return { success: true };
}
