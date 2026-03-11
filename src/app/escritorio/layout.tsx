import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import type { Branding } from "@/types/database";

export default async function OfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["leader", "user"]);
  const supabase = await createClient();

  let officeName = "Escritório";
  let branding: Branding | null = null;
  let platformLogoUrl: string | null = null;

  const defaultBrandingPromise = supabase
    .from("branding")
    .select("logo_url")
    .eq("is_default", true)
    .is("office_id", null)
    .maybeSingle();

  if (profile.office_id) {
    const [{ data: office }, { data: brandingData }, { data: defaultBranding }] = await Promise.all([
      supabase.from("offices").select("name").eq("id", profile.office_id).single(),
      supabase.from("branding").select("*").eq("office_id", profile.office_id).maybeSingle(),
      defaultBrandingPromise,
    ]);

    if (office) officeName = office.name;
    if (brandingData) branding = brandingData as Branding;
    platformLogoUrl = defaultBranding?.logo_url ?? null;
  } else {
    const { data: defaultBranding } = await defaultBrandingPromise;
    platformLogoUrl = defaultBranding?.logo_url ?? null;
  }

  return (
    <AppShell
      profile={profile}
      officeName={officeName}
      branding={branding}
      platformLogoUrl={platformLogoUrl}
    >
      {children}
    </AppShell>
  );
}
