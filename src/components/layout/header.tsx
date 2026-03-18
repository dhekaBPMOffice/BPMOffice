"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, Sun, Moon, Monitor } from "lucide-react";
import { type Profile } from "@/types/database";

import { useTheme } from "@/components/providers/theme-provider";

const NotificationBell = dynamic(
  () => import("./notification-bell").then((m) => ({ default: m.NotificationBell })),
  { ssr: false }
);

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const roleLabels: Record<string, string> = {
  admin_master: "Administrador Master",
  leader: "Líder do Escritório",
  user: "Usuário",
};

const AVATAR_COLORS = [
  "from-[var(--dheka-teal)] to-[var(--dheka-cyan)]",
  "from-[var(--dheka-purple)] to-[var(--dheka-magenta)]",
  "from-[var(--dheka-navy)] to-[var(--dheka-teal)]",
  "from-[var(--dheka-green)] to-[var(--dheka-lime)]",
];

function getAvatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Header({
  profile,
  platformLogoUrl,
}: {
  profile: Profile;
  platformLogoUrl?: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  function cycleTheme() {
    setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const avatarGradient = getAvatarGradient(profile.full_name);
  const avatarImageSrc =
    profile.role === "admin_master"
      ? platformLogoUrl || profile.avatar_url
      : profile.avatar_url;

  return (
    <header className="relative z-[100] flex h-14 items-center justify-between border-b border-border/60 bg-card/80 backdrop-blur-sm px-6 shrink-0">
      <div className="accent-line absolute top-0 left-0 right-0" />
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {roleLabels[profile.role] ?? profile.role}
        </h2>
        {profile.role !== "admin_master" && platformLogoUrl && (
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-border/50 px-2 py-1 bg-background/60">
            <img
              src={platformLogoUrl}
              alt="Marca da plataforma"
              className="h-4 w-auto object-contain"
            />
            <span className="text-[11px] text-muted-foreground">Plataforma dheka</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={cycleTheme}
          title={
            theme === "light"
              ? "Tema claro (clique para escuro)"
              : theme === "dark"
                ? "Tema escuro (clique para sistema)"
                : "Seguir sistema (clique para claro)"
          }
          className="h-9 w-9 rounded-lg text-muted-foreground hover:text-[var(--identity-primary)] hover:bg-accent/50 transition-all duration-150"
        >
          {theme === "light" ? (
            <Sun className="h-4 w-4" />
          ) : theme === "dark" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Monitor className="h-4 w-4" />
          )}
        </Button>

        <NotificationBell profileId={profile.id} />

        <div className="h-5 w-px bg-border/50 mx-1" />

        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-border/60">
            {avatarImageSrc && (
              <AvatarImage
                src={avatarImageSrc}
                alt={profile.full_name}
                className="object-cover"
              />
            )}
            <AvatarFallback className={`text-xs font-semibold text-white bg-gradient-to-br ${avatarGradient}`}>
              {getInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-none text-foreground">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{profile.email}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          title="Sair da conta"
          className="gap-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-all duration-150"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
}
