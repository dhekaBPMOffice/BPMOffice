"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { uploadBrandingLogo } from "@/lib/branding/logo-upload";

export async function saveDefaultBranding(data: {
  id?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string | null;
  logo_file_data_url?: string | null;
}) {
  const supabase = await createServiceClient();
  let logoUrl = data.logo_url;

  async function syncAdminAvatar(url: string | null) {
    if (!url) return null;
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("role", "admin_master");
    return error;
  }

  if (data.logo_file_data_url) {
    const uploaded = await uploadBrandingLogo(supabase, {
      dataUrl: data.logo_file_data_url,
      scope: "default",
    });

    if ("error" in uploaded) return { error: uploaded.error };
    logoUrl = uploaded.url;
  }

  if (data.id) {
    const { error } = await supabase
      .from("branding")
      .update({
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        accent_color: data.accent_color,
        logo_url: logoUrl,
      })
      .eq("id", data.id);

    if (error) return { error: error.message };
  } else {
    const { data: inserted, error } = await supabase
      .from("branding")
      .insert({
        office_id: null,
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        accent_color: data.accent_color,
        logo_url: logoUrl,
        is_default: true,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };
    const avatarError = await syncAdminAvatar(logoUrl);
    if (avatarError) return { error: avatarError.message };
    revalidatePath("/admin/branding");
    revalidatePath("/admin");
    revalidatePath("/escritorio");
    revalidatePath("/login");
    return { success: true, id: inserted?.id, logo_url: logoUrl };
  }

  const avatarError = await syncAdminAvatar(logoUrl);
  if (avatarError) return { error: avatarError.message };
  revalidatePath("/admin/branding");
  revalidatePath("/admin");
  revalidatePath("/escritorio");
  revalidatePath("/login");
  return { success: true, logo_url: logoUrl };
}
