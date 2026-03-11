import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { IdentityProvider } from "@/components/providers/identity-provider";
import { type Profile, type UserRole } from "@/types/database";
import type { Branding } from "@/types/database";

interface AppShellProps {
  children: React.ReactNode;
  profile: Profile;
  officeName?: string;
  branding?: Branding | null;
  platformLogoUrl?: string | null;
}

export function AppShell({
  children,
  profile,
  officeName,
  branding = null,
  platformLogoUrl = null,
}: AppShellProps) {
  return (
    <IdentityProvider branding={branding}>
      <div className="flex h-screen overflow-hidden bg-surface-elevated">
        <Sidebar
          role={profile.role as UserRole}
          officeName={officeName}
          logoUrl={branding?.logo_url ?? null}
        />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Header profile={profile} platformLogoUrl={platformLogoUrl} />
          <main
            className="flex-1 overflow-y-auto bg-background bg-dheka-pattern"
            style={{ padding: "var(--spacing-page)" }}
          >
            {children}
          </main>
        </div>
      </div>
    </IdentityProvider>
  );
}
