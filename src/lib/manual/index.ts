import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";
import { MANUAL_MODULES } from "./config";

export function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.*)$/gm, "<h3 class='text-lg font-semibold mt-4 mb-2'>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2 class='text-xl font-semibold mt-6 mb-3'>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1 class='text-2xl font-bold mt-4 mb-4'>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^- (.*)$/gm, "<li class='my-1'>$1</li>")
    .replace(/(<li class='my-1'>.*<\/li>\n?)+/g, (m) => `<ul class='list-disc ml-4 my-2'>${m}</ul>`)
    .replace(/\n\n/g, "</p><p class='my-2 leading-relaxed'>")
    .replace(/\n/g, "<br />")
    .replace(/^/, "<div class='leading-relaxed'>")
    .replace(/$/, "</div>");
}

export async function getAllowedModuleIds(profile: Profile): Promise<Set<string>> {
  const allowed = new Set<string>();

  allowed.add("introducao");
  allowed.add("trabalho"); // Área de Trabalho visível para todos os usuários do escritório

  if (profile.role === "admin_master" || profile.role === "leader") {
    MANUAL_MODULES.forEach((m) => allowed.add(m.id));
    return allowed;
  }

  if (profile.custom_role_id) {
    const supabase = await createClient();
    const { data: perms } = await supabase
      .from("role_permissions")
      .select("resource, can_view")
      .eq("role_id", profile.custom_role_id)
      .eq("can_view", true);

    const allowedResources = new Set((perms ?? []).map((p) => p.resource));

    MANUAL_MODULES.forEach((m) => {
      if (!m.resource) allowed.add(m.id);
      else if (allowedResources.has(m.resource)) allowed.add(m.id);
    });
  } else if (profile.role === "user") {
    // Usuário sem custom_role: acesso padrão aos módulos do sidebar
    allowed.add("trabalho");
    allowed.add("demandas");
    allowed.add("conhecimento");
    allowed.add("capacitacao");
  }

  return allowed;
}
