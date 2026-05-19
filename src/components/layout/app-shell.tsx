import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { IdentityProvider } from "@/components/providers/identity-provider";
import { TimezoneProvider } from "@/components/providers/timezone-provider";
import { DEFAULT_TIME_ZONE } from "@/lib/timezone";
import { type Profile, type UserRole } from "@/types/database";
import type { Branding } from "@/types/database";
import type { AreaAccessMap } from "@/lib/system-areas";

interface AppShellProps {
  children: React.ReactNode;
  profile: Profile;
  officeName?: string;
  branding?: Branding | null;
  platformLogoUrl?: string | null;
  /** Fuso IANA para formatação de datas nesta área (admin ou escritório). */
  timeZone?: string;
  allowedAreas?: AreaAccessMap;
}

export function AppShell({
  children,
  profile,
  officeName,
  branding = null,
  platformLogoUrl = null,
  timeZone = DEFAULT_TIME_ZONE,
  allowedAreas,
}: AppShellProps) {
  return (
    <IdentityProvider branding={branding}>
      <TimezoneProvider timeZone={timeZone}>
        <div className="flex h-screen overflow-hidden bg-surface-elevated">
          <Sidebar
            role={profile.role as UserRole}
            officeName={officeName}
            logoUrl={branding?.logo_url ?? null}
            allowedAreas={allowedAreas}
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
      </TimezoneProvider>
    </IdentityProvider>
  );
}
