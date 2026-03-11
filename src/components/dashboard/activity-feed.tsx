import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Activity } from "lucide-react";
import { IconChip } from "@/components/ui/icon-chip";

export interface ActivityItem {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
  userId?: string | null;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  maxItems?: number;
}

const DOT_GRADIENTS = [
  "bg-gradient-to-br from-[var(--dheka-teal)] to-[var(--dheka-cyan)]",
  "bg-gradient-to-br from-[var(--dheka-green)] to-[var(--dheka-lime)]",
  "bg-gradient-to-br from-[var(--dheka-purple)] to-[var(--dheka-magenta)]",
  "bg-gradient-to-br from-[var(--dheka-magenta)] to-[var(--dheka-purple)]",
  "bg-gradient-to-br from-[var(--dheka-navy)] to-[var(--dheka-teal)]",
  "bg-gradient-to-br from-[var(--dheka-cyan)] to-[var(--dheka-teal)]",
  "bg-gradient-to-br from-[var(--dheka-yellow)] to-[var(--dheka-lime)]",
];

export function ActivityFeed({ items, maxItems = 10 }: ActivityFeedProps) {
  const displayItems = items.slice(0, maxItems);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-foreground">
          <IconChip variant="teal" size="sm">
            <Activity className="h-4 w-4 text-white" />
          </IconChip>
          Últimas Modificações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayItems.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Nenhuma atividade recente"
            description="As alterações no sistema aparecerão aqui."
          />
        ) : (
          <ul className="space-y-3">
            {displayItems.map((item, idx) => (
              <li
                key={item.id}
                className="flex items-start gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0"
              >
                <div className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${DOT_GRADIENTS[idx % DOT_GRADIENTS.length]}`} />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium text-foreground">{item.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.resourceType}
                    {item.resourceId && ` · ${item.resourceId}`}
                  </span>
                  <span className="text-xs text-muted-foreground/70">
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
