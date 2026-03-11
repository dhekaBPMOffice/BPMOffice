"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";

export function ThemeToggleFixed() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const hasShell = pathname?.startsWith("/escritorio") || pathname?.startsWith("/admin");
  if (hasShell) return null;

  function cycleTheme() {
    setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  }

  return (
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
      className="fixed top-4 right-4 z-50 text-muted-foreground hover:text-[var(--identity-primary)] bg-card/80 backdrop-blur shadow-sm border border-border"
    >
      {theme === "light" ? (
        <Sun className="h-4 w-4" />
      ) : theme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Monitor className="h-4 w-4" />
      )}
    </Button>
  );
}
