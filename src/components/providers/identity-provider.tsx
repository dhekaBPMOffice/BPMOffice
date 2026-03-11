"use client";

import * as React from "react";
import type { Branding } from "@/types/database";

function hexToLuminance(hex: string): number {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const [rs, gs, bs] = [r, g, b].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function foregroundForBackground(hex: string): string {
  return hexToLuminance(hex) < 0.5 ? "#ffffff" : "#0a0a0a";
}

export interface IdentityContextValue {
  branding: Branding | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

const IdentityContext = React.createContext<IdentityContextValue | null>(null);

export function useIdentity() {
  return React.useContext(IdentityContext);
}

interface IdentityProviderProps {
  children: React.ReactNode;
  branding: Branding | null;
}

export function IdentityProvider({ children, branding }: IdentityProviderProps) {
  const style = React.useMemo(() => {
    if (!branding) return undefined;
    const LEGACY_BLUE = "#1d4ed8";
    const primary =
      (branding.primary_color === LEGACY_BLUE ? "#0097a7" : branding.primary_color) ||
      "#0097a7";
    const secondary = branding.secondary_color || "#7b1fa2";
    const accent = branding.accent_color || "#c2185b";
    return {
      "--identity-primary": primary,
      "--identity-primary-foreground": foregroundForBackground(primary),
      "--identity-secondary": secondary,
      "--identity-accent": accent,
    } as React.CSSProperties;
  }, [branding]);

  const contextValue = React.useMemo<IdentityContextValue>(
    () => ({
      branding,
      logoUrl: branding?.logo_url ?? null,
      primaryColor: branding?.primary_color ?? "#0097a7",
      secondaryColor: branding?.secondary_color ?? "#7b1fa2",
      accentColor: branding?.accent_color ?? "#c2185b",
    }),
    [branding]
  );

  return (
    <IdentityContext.Provider value={contextValue}>
      <div className="h-full flex flex-col" style={style}>
        {children}
      </div>
    </IdentityContext.Provider>
  );
}
