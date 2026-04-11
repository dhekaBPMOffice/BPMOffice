import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ArrowRight, ClipboardList, FileText, Info, Sparkles } from "lucide-react";

export type ProcessWorkspaceOperationalHeaderProps = {
  processName: string;
  statusBadge: { label: string; variant: string };
  currentBpmLabel: string;
  progressPercent: number;
  completedBpmCount: number;
  totalBpmPhases: number;
  checklistCompleted: number;
  checklistTotal: number;
  primaryPendingChecklist: { title: string } | null;
  lastActivity: {
    relative: string;
    summary: string;
  } | null;
  continueLabel: string;
  onContinueToNextStep: () => void;
  onOpenDocuments: () => void;
  onOpenChecklist: () => void;
  meta: {
    ownerName: string;
    originLabel: string;
  };
  liveSignals: {
    rhythm: { label: string; tone: "fresh" | "idle" | "empty"; idleRoughLabel?: string };
    activeTabLabel: string;
    miniProgress: { percent: number; completed: number; total: number } | null;
    insightLines: string[];
  };
};

function rhythmBadgeVariant(tone: "fresh" | "idle" | "empty"): "success" | "warning" | "outline" {
  if (tone === "fresh") return "success";
  if (tone === "idle") return "warning";
  return "outline";
}

export function ProcessWorkspaceOperationalHeader({
  processName,
  statusBadge,
  currentBpmLabel,
  progressPercent,
  completedBpmCount,
  totalBpmPhases,
  checklistCompleted,
  checklistTotal,
  primaryPendingChecklist,
  lastActivity,
  continueLabel,
  onContinueToNextStep,
  onOpenDocuments,
  onOpenChecklist,
  meta,
  liveSignals,
}: ProcessWorkspaceOperationalHeaderProps) {
  const rhythmVariant = rhythmBadgeVariant(liveSignals.rhythm.tone);

  return (
    <div
      className={cn(
        "w-full rounded-xl border border-border/80 bg-card shadow-[var(--shadow-card)] transition-shadow duration-200",
        "border-l-[4px] border-l-[var(--identity-primary)]"
      )}
    >
      <div className="grid grid-cols-1 gap-6 p-4 sm:p-5 lg:grid-cols-10 lg:gap-8">
        {/* 70% — retomada */}
        <div className="min-w-0 space-y-4 lg:col-span-7">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{processName}</h1>
            <p className="text-sm text-muted-foreground">
              Etapa atual:{" "}
              <span className="font-semibold text-[var(--identity-primary)]">{currentBpmLabel}</span>
            </p>
          </div>

          <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-3 sm:px-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={rhythmVariant}>{liveSignals.rhythm.label}</Badge>
              {liveSignals.rhythm.idleRoughLabel ? (
                <span className="text-xs text-muted-foreground">{liveSignals.rhythm.idleRoughLabel}</span>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Aba aberta:</span>{" "}
                {liveSignals.activeTabLabel}
              </p>
              {liveSignals.miniProgress ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Progresso nesta etapa
                  </span>
                  <div className="h-1.5 min-w-[72px] flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[var(--identity-primary)] transition-[width] duration-300 ease-out"
                      style={{ width: `${liveSignals.miniProgress.percent}%` }}
                    />
                  </div>
                  <span className="shrink-0 tabular-nums text-xs font-medium text-foreground">
                    {liveSignals.miniProgress.completed}/{liveSignals.miniProgress.total}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Esta vista não tem sub-fases BPM dedicadas.</p>
              )}
            </div>
            {liveSignals.insightLines.length > 0 ? (
              <div className="flex gap-2 border-border/50 border-t pt-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--identity-primary)]" aria-hidden />
                <ul className="space-y-1 text-xs leading-relaxed text-muted-foreground">
                  {liveSignals.insightLines.slice(0, 2).map((line, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="text-[var(--identity-primary)]">·</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {primaryPendingChecklist ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Pendência principal
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">
                {primaryPendingChecklist.title}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem itens pendentes no checklist.</p>
          )}

          {lastActivity ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Última atividade
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-foreground">
                <span className="tabular-nums text-muted-foreground">{lastActivity.relative}</span>
                <span className="text-muted-foreground"> · </span>
                {lastActivity.summary}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem eventos recentes registados.</p>
          )}

          <div>
            <Button type="button" className="gap-2" onClick={onContinueToNextStep}>
              {continueLabel}
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Button>
          </div>
        </div>

        {/* 30% — ciclo, checklist, documentos, responsável */}
        <div className="flex min-w-0 flex-col gap-3 border-border/60 border-t pt-4 lg:col-span-3 lg:border-l lg:border-t-0 lg:pt-0 lg:pl-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Ciclo BPM</span>
              <span className="tabular-nums font-medium text-foreground">
                {completedBpmCount}/{totalBpmPhases} · {progressPercent}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[var(--identity-primary)] transition-[width] duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Checklist
              </p>
              <p className="text-sm font-medium tabular-nums text-foreground">
                {checklistCompleted}/{checklistTotal}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onOpenChecklist}>
              <ClipboardList className="mr-1.5 h-4 w-4" aria-hidden />
              Abrir
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full justify-center gap-2 sm:w-auto"
            onClick={onOpenDocuments}
          >
            <FileText className="h-4 w-4" aria-hidden />
            Documentos
          </Button>

          <div className="text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Responsável
            </p>
            <p className="mt-0.5 font-medium text-foreground">{meta.ownerName}</p>
          </div>

          <Popover>
            <PopoverTrigger className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              <Info className="h-3.5 w-3.5" aria-hidden />
              Origem e detalhes
            </PopoverTrigger>
            <PopoverContent align="end" className="max-w-sm text-sm">
              <p className="font-medium text-foreground">Resumo</p>
              <ul className="mt-2 space-y-1.5 text-muted-foreground">
                <li>
                  <span className="text-foreground">Estado:</span> {statusBadge.label}
                </li>
                <li>
                  <span className="text-foreground">Etapa BPM:</span> {currentBpmLabel}
                </li>
                <li>
                  <span className="text-foreground">Responsável:</span> {meta.ownerName}
                </li>
                <li>
                  <span className="text-foreground">Origem:</span> {meta.originLabel}
                </li>
                <li>
                  <span className="text-foreground">Progresso:</span> {progressPercent}% do ciclo
                </li>
              </ul>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
