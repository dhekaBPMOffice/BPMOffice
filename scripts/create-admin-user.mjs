/**
 * Script para criar o usuário Administrador Master no Supabase.
 * Execute: node scripts/create-admin-user.mjs
 * Certifique-se de ter .env.local com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Carregar .env.local
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
  console.error("Erro: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const ADMIN_EMAIL = "admin@bpmoffice.com";
const ADMIN_PASSWORD = "BPMOffice@Admin2025";

async function main() {
  console.log("Criando usuário administrador master...\n");

  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Administrador Master" },
  });

  if (createError) {
    if (createError.message?.includes("already been registered") || createError.message?.includes("already exists")) {
      console.log("Usuário já existe. Atualizando perfil para admin_master...\n");
      const { data: existing } = await supabase.auth.admin.listUsers();
      const user = existing?.users?.find((u) => u.email === ADMIN_EMAIL);
      if (!user) {
        console.error("Não foi possível encontrar o usuário existente.");
        process.exit(1);
      }
      await setAdminMaster(supabase, user.id);
      console.log("Pronto. Use as credenciais abaixo para fazer login:\n");
      console.log("  E-mail:", ADMIN_EMAIL);
      console.log("  Senha:  (a que você definiu ao criar o usuário manualmente)");
      console.log("\nSe não lembrar a senha, redefina em: Supabase Dashboard → Authentication → Users → usuário → ... → Send password recovery");
      return;
    }
    console.error("Erro ao criar usuário:", createError.message);
    process.exit(1);
  }

  const userId = userData.user.id;

  // O trigger pode ter criado o perfil; garantimos que seja admin_master
  await setAdminMaster(supabase, userId);

  console.log("Usuário administrador master criado com sucesso.\n");
  console.log("Use estas credenciais para fazer login:\n");
  console.log("  E-mail:", ADMIN_EMAIL);
  console.log("  Senha: ", ADMIN_PASSWORD);
  console.log("\nRecomendado: após o primeiro login, altere a senha em primeiro-acesso ou nas configurações.");
}

async function setAdminMaster(supabaseClient, authUserId) {
  const { error: updateError } = await supabaseClient
    .from("profiles")
    .update({
      role: "admin_master",
      must_change_password: false,
      password_change_approved: true,
    })
    .eq("auth_user_id", authUserId);

  if (updateError) {
    const { error: insertError } = await supabaseClient.from("profiles").insert({
      auth_user_id: authUserId,
      full_name: "Administrador Master",
      email: ADMIN_EMAIL,
      role: "admin_master",
      must_change_password: false,
      password_change_approved: true,
    });
    if (insertError) {
      console.error("Erro ao definir perfil admin_master:", updateError.message || insertError.message);
      process.exit(1);
    }
  }
}

main();
