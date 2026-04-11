import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ProcessWorkspaceWorkPanel } from "./process-workspace-work-panel";

/** Área de trabalho 70/30: cabeçalho do módulo + conteúdo dentro do mesmo bloco branco. */
export function ProcessWorkspaceStageLayout({
  moduleTitle,
  moduleDescription,
  stageObjective,
  contextHint,
  sidebar,
  children,
  workPanelClassName,
}: {
  moduleTitle: string;
  moduleDescription: string;
  /** Objetivo operacional curto da etapa (propósito imediato para o utilizador). */
  stageObjective: string;
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
          <header className="space-y-3 border-b border-border/60 pb-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{moduleTitle}</h2>
              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {moduleDescription}
              </p>
              <p className="text-xs text-muted-foreground">{contextHint}</p>
            </div>
            <div className="rounded-lg border border-border/50 border-l-[3px] border-l-[var(--identity-primary)] bg-muted/35 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Objetivo desta etapa
              </p>
              <p className="mt-1 text-sm leading-snug text-foreground">{stageObjective}</p>
            </div>
          </header>
          <div className="min-w-0">{children}</div>
        </ProcessWorkspaceWorkPanel>
      </div>
      <aside className="min-w-0 lg:col-span-3">{sidebar}</aside>
    </div>
  );
}
