import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

const workspaceCardClass =
  "border-border/70 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md";

export function ProcessWorkspaceSidebar({
  statusLabel,
  statusVariant,
  recentEvents,
  onViewFullHistory,
  checklistSummary,
  attachmentsCount,
  materialsCount,
  insightHints,
}: {
  statusLabel: string;
  statusVariant: NonNullable<BadgeProps["variant"]>;
  recentEvents: Array<{ id: string; relative: string; summary: string }>;
  onViewFullHistory: () => void;
  checklistSummary: string;
  attachmentsCount: number;
  materialsCount: number;
  insightHints: string[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <Card className={cn(workspaceCardClass)}>
        <CardHeader className="space-y-0 pb-2 pt-4">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Status operacional
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 pt-0">
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </CardContent>
      </Card>

      <Card className={cn(workspaceCardClass)}>
        <CardHeader className="space-y-0 pb-2 pt-4">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Histórico recente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4 pt-0">
          {recentEvents.length > 0 ? (
            <ul className="relative space-y-0 pl-1">
              {recentEvents.map((ev, index) => (
                <li key={ev.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < recentEvents.length - 1 ? (
                    <span
                      className="absolute top-3 bottom-0 left-[7px] w-px bg-border/90"
                      aria-hidden
                    />
                  ) : null}
                  <span
                    className="relative z-[1] mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[var(--identity-primary)]/50 bg-card shadow-sm ring-2 ring-background"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-[11px] font-medium tabular-nums text-muted-foreground">
                      {ev.relative}
                    </p>
                    <p className="line-clamp-3 text-sm leading-snug text-foreground">{ev.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Sem eventos recentes.</p>
          )}
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={onViewFullHistory}>
            Ver histórico completo
          </Button>
        </CardContent>
      </Card>

      <Card className={cn(workspaceCardClass)}>
        <CardHeader className="space-y-0 pb-2 pt-4">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Base ativa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 pb-4 pt-0 text-sm text-foreground">
          <p>{checklistSummary}</p>
          <p className="text-xs text-muted-foreground">
            {attachmentsCount} anexo(s) · {materialsCount} material(is)
          </p>
        </CardContent>
      </Card>

      <Card
        className={cn(
          workspaceCardClass,
          "overflow-hidden border-[var(--identity-primary)]/25 bg-gradient-to-br from-[var(--identity-primary)]/[0.07] via-card to-card"
        )}
      >
        <CardHeader className="space-y-1 pb-2 pt-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--identity-primary)]" aria-hidden />
            <CardTitle className="text-sm font-semibold normal-case tracking-tight text-foreground">
              Sugestões contextuais
            </CardTitle>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Sugestões baseadas no estado do processo (regras e sinais da workspace).
          </p>
        </CardHeader>
        <CardContent className="pb-4 pt-0">
          {insightHints.length > 0 ? (
            <ul className="space-y-2 text-sm leading-snug text-foreground">
              {insightHints.slice(0, 3).map((hint, i) => (
                <li key={i} className="flex gap-2 rounded-md border border-border/40 bg-card/80 px-2.5 py-2">
                  <span className="mt-0.5 font-semibold text-[var(--identity-primary)]">→</span>
                  <span>{hint}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Quando houver mais dados (checklist, fases e histórico), aparecerão sugestões aqui.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
