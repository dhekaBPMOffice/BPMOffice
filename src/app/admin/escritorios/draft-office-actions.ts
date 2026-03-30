"use server";

import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** Cria escritório com nome/slug provisórios e branding padrão; usado por `createDraftOfficeAndRedirect`. */
export async function createDraftOfficeForAdmin(): Promise<{ id: string } | { error: string }> {
  const profile = await getProfile();
  if (profile.role !== "admin_master") {
    return { error: "Sem permissão para criar escritório." };
  }

  const supabase = await createServiceClient();
  const slug = `escritorio-${randomUUID().replace(/-/g, "")}`;

  const { data: office, error: officeError } = await supabase
    .from("offices")
    .insert({
      name: "Novo escritório",
      slug,
      plan_id: null,
      is_active: true,
    })
    .select("id")
    .single();

  if (officeError) {
    if (officeError.code === "23505") {
      return { error: "Não foi possível gerar um slug único. Tente novamente." };
    }
    return { error: officeError.message };
  }

  if (!office) {
    return { error: "Escritório não foi criado." };
  }

  const { error: brandingError } = await supabase.from("branding").insert({
    office_id: office.id,
    primary_color: "#0097a7",
    secondary_color: "#7b1fa2",
    accent_color: "#c2185b",
    is_default: false,
  });

  if (brandingError) {
    await supabase.from("offices").delete().eq("id", office.id);
    return { error: "Erro ao criar identidade visual do escritório." };
  }

  revalidatePath("/admin/escritorios");
  revalidatePath("/admin");
  return { id: office.id };
}

/** Server action para o botão «Novo Escritório» na lista (POST). */
export async function createDraftOfficeAndRedirect() {
  const result = await createDraftOfficeForAdmin();
  if ("error" in result) {
    redirect(`/admin/escritorios?novo_erro=${encodeURIComponent(result.error)}`);
  }
  redirect(`/admin/escritorios/${result.id}`);
}
