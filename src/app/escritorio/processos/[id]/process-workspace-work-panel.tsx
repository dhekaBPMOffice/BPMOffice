import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Painel único da área de trabalho (contraste com cabeçalho e trilho). */
export function ProcessWorkspaceWorkPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-4 shadow-[var(--shadow-card)] transition-shadow duration-200 ease-out hover:shadow-md sm:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}
