import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconChip } from "@/components/ui/icon-chip";
import type { LucideIcon } from "lucide-react";

export function ProcessWorkspacePlaceholderCard({
  icon: Icon,
  title,
  description,
  bullets,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  bullets: string[];
}) {
  return (
    <Card className="border-dashed border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Expansão futura
        </div>
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
          <IconChip variant="teal" size="sm">
            <Icon className="h-4 w-4 text-white" />
          </IconChip>
          {title}
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--identity-primary)]/70" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
