import { createBrowserClient } from "@supabase/ssr";

function getSupabaseBrowserConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local e reinicie o servidor de desenvolvimento."
    );
  }
  return { url, anonKey };
}

export function createClient() {
  const { url, anonKey } = getSupabaseBrowserConfig();
  return createBrowserClient(url, anonKey);
}
