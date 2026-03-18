import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import type { Branding } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["admin_master"]);
  const supabase = await createClient();
  const { data: defaultBranding } = await supabase
    .from("branding")
    .select("*")
    .eq("is_default", true)
    .is("office_id", null)
    .maybeSingle();

  const branding = (defaultBranding as Branding | null) ?? null;

  return (
    <AppShell
      profile={profile}
      officeName="Administração Master"
      branding={branding}
      platformLogoUrl={branding?.logo_url ?? null}
    >
      {children}
    </AppShell>
  );
}
