import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ProcessWorkspaceWorkPanel } from "./process-workspace-work-panel";

/** Área de trabalho 70/30: cabeçalho do módulo + conteúdo dentro do mesmo bloco branco. */
export function ProcessWorkspaceStageLayout({
  moduleTitle,
  moduleDescription,
  contextHint,
  sidebar,
  children,
  workPanelClassName,
}: {
  moduleTitle: string;
  moduleDescription: string;
  contextHint: string;
  sidebar: ReactNode;
  children: ReactNode;
  /** Espaço vertical extra entre cabeçalho e conteúdo (ex.: space-y-8). */
  workPanelClassName?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-10 lg:gap-8">
      <div className="min-w-0 lg:col-span-7">
        <ProcessWorkspaceWorkPanel className={cn("space-y-6", workPanelClassName)}>
          <header className="space-y-1 border-b border-border/60 pb-4">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{moduleTitle}</h2>
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {moduleDescription}
            </p>
            <p className="text-xs text-muted-foreground">{contextHint}</p>
          </header>
          <div className="min-w-0">{children}</div>
        </ProcessWorkspaceWorkPanel>
      </div>
      <aside className="min-w-0 lg:col-span-3">{sidebar}</aside>
    </div>
  );
}
