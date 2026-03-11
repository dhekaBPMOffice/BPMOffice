/**
 * Garante que o usuário admin@bpmoffice.com tenha perfil admin_master.
 * Execute: node scripts/ativar-admin-master.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");
if (existsSync(envPath)) {
  readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Erro: .env.local precisa de NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const ADMIN_EMAIL = "admin@bpmoffice.com";

async function main() {
  const { data: list } = await supabase.auth.admin.listUsers();
  const user = list?.users?.find((u) => u.email === ADMIN_EMAIL);
  if (!user) {
    console.error("Usuário admin@bpmoffice.com não encontrado. Rode antes: node scripts/create-admin-user.mjs");
    process.exit(1);
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      role: "admin_master",
      must_change_password: false,
      password_change_approved: true,
    })
    .eq("auth_user_id", user.id);

  if (updateError) {
    const { error: insertError } = await supabase.from("profiles").insert({
      auth_user_id: user.id,
      full_name: "Administrador Master",
      email: ADMIN_EMAIL,
      role: "admin_master",
      must_change_password: false,
      password_change_approved: true,
    });
    if (insertError) {
      console.error("Erro ao ativar perfil:", updateError.message || insertError.message);
      process.exit(1);
    }
  }

  console.log("Perfil de admin@bpmoffice.com definido como admin_master.");
  console.log("Agora execute no Supabase Dashboard → SQL Editor o conteúdo do arquivo:");
  console.log("  supabase/scripts/fix-rls-ler-proprio-perfil.sql");
}

main();
