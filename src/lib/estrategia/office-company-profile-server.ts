import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import type { OfficeCompanyProfile } from "@/types/database";

/** Leitura do perfil da empresa (uso em Server Components; não é Server Action). */
export async function fetchOfficeCompanyProfile(): Promise<{
  profile: OfficeCompanyProfile | null;
  officeName: string;
  error: string | null;
}> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) {
    return { profile: null, officeName: "", error: "Escritório não encontrado." };
  }

  const [{ data: office }, { data: row, error }] = await Promise.all([
    supabase.from("offices").select("name").eq("id", profile.office_id).maybeSingle(),
    supabase
      .from("office_company_profiles")
      .select("*")
      .eq("office_id", profile.office_id)
      .maybeSingle(),
  ]);

  if (error) {
    const hint =
      error.message.includes("office_company_profiles") ||
      error.message.toLowerCase().includes("does not exist")
        ? " A tabela de Dados da Empresa ainda não foi criada no Supabase (migration 047)."
        : "";
    return { profile: null, officeName: office?.name ?? "", error: `${error.message}${hint}` };
  }

  return {
    profile: (row as OfficeCompanyProfile | null) ?? null,
    officeName: office?.name ?? "",
    error: null,
  };
}
