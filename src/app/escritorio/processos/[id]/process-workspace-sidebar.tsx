import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ProcessWorkspaceSidebar({
  statusLabel,
  statusVariant,
  lastEventSummary,
  lastEventRelative,
  onViewFullHistory,
  checklistSummary,
  attachmentsCount,
  materialsCount,
}: {
  statusLabel: string;
  statusVariant: NonNullable<BadgeProps["variant"]>;
  lastEventSummary: string | null;
  lastEventRelative: string | null;
  onViewFullHistory: () => void;
  checklistSummary: string;
  attachmentsCount: number;
  materialsCount: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="space-y-0 pb-2 pt-4">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Status operacional
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 pt-0">
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="space-y-0 pb-2 pt-4">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Histórico recente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pb-4 pt-0">
          {lastEventSummary ? (
            <p className="line-clamp-3 text-sm text-foreground">
              {lastEventRelative ? (
                <span className="tabular-nums text-muted-foreground">{lastEventRelative} · </span>
              ) : null}
              {lastEventSummary}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Sem eventos recentes.</p>
          )}
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={onViewFullHistory}>
            Ver histórico completo
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
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

      <Card className="border-dashed border-border/70 bg-card shadow-sm">
        <CardHeader className="space-y-0 pb-2 pt-4">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 pt-0 text-xs leading-relaxed text-muted-foreground">
          Indicadores consolidados surgirão aqui à medida que o processo acumular sinais na workspace.
        </CardContent>
      </Card>
    </div>
  );
}
