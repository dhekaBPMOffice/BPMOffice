"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { uploadBrandingLogo } from "@/lib/branding/logo-upload";

export type BrandingInput = {
  logo_url?: string | null;
  logo_file_data_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  cover_url?: string | null;
  header_html?: string | null;
  footer_html?: string | null;
};

export async function saveOfficeBranding(input: BrandingInput) {
  const profile = await getProfile();
  if (profile.role !== "leader" || !profile.office_id) {
    return { error: "Sem permissão para alterar identidade visual." };
  }

  const supabase = await createServiceClient();
  let logoUrl = input.logo_url ?? null;

  if (input.logo_file_data_url) {
    const uploaded = await uploadBrandingLogo(supabase, {
      dataUrl: input.logo_file_data_url,
      scope: "office",
      officeId: profile.office_id,
    });

    if ("error" in uploaded) return { error: uploaded.error };
    logoUrl = uploaded.url;
  }

  const { data: existing } = await supabase
    .from("branding")
    .select("id")
    .eq("office_id", profile.office_id)
    .single();

  const payload = {
    logo_url: logoUrl,
    primary_color: input.primary_color ?? "#0097a7",
    secondary_color: input.secondary_color ?? "#7b1fa2",
    accent_color: input.accent_color ?? "#c2185b",
    cover_url: input.cover_url ?? null,
    header_html: input.header_html ?? null,
    footer_html: input.footer_html ?? null,
    is_default: false,
  };

  if (existing) {
    const { error } = await supabase
      .from("branding")
      .update(payload)
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("branding").insert({
      office_id: profile.office_id,
      ...payload,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/escritorio/branding");
  return { success: true, logo_url: logoUrl };
}
