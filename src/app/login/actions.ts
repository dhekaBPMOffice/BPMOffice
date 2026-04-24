"use server";

import { createClient } from "@/lib/supabase/server";

export type LoginActionResult = { error: string } | { ok: true };

export async function signInWithPasswordAction(
  email: string,
  password: string
): Promise<LoginActionResult> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });

  if (error) {
    return { error: "E-mail ou senha inválidos." };
  }

  return { ok: true };
}
