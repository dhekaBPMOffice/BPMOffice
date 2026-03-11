import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { type Profile } from "@/types/database";

export async function getProfile(): Promise<Profile> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Tentar com service role primeiro (ignora RLS)
  try {
    const supabaseAdmin = await createServiceClient();
    if (supabaseAdmin) {
      const { data: profile, error } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("auth_user_id", user.id)
        .single();

      if (!error && profile) {
        return profile as Profile;
      }
    }
  } catch {
    // Service role indisponível ou falha: usar cliente normal (RLS aplicado)
  }

  // Fallback: ler perfil com cliente anon (políticas users_read_own_profile / users_read_own_office_profiles)
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile) {
    redirect("/conta-pendente");
  }

  return profile as Profile;
}

export async function requireRole(allowedRoles: string[]): Promise<Profile> {
  const profile = await getProfile();

  if (!allowedRoles.includes(profile.role)) {
    redirect("/login");
  }

  return profile;
}
