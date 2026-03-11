import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconChip } from "@/components/ui/icon-chip";
import type { IconChipVariant } from "@/components/ui/icon-chip";

const CARD_THEMES: { borderClass: string; iconVariant: IconChipVariant }[] = [
  {
    borderClass: "border-[var(--dheka-teal)]",
    iconVariant: "teal",
  },
  {
    borderClass: "border-[var(--dheka-purple)]",
    iconVariant: "purple",
  },
  {
    borderClass: "border-[var(--dheka-green)]",
    iconVariant: "warm",
  },
  {
    borderClass: "border-[var(--dheka-magenta)]",
    iconVariant: "warm",
  },
  {
    borderClass: "border-[var(--dheka-navy)]",
    iconVariant: "mixed",
  },
  {
    borderClass: "border-[var(--dheka-yellow)]",
    iconVariant: "purple",
  },
  {
    borderClass: "border-[var(--dheka-cyan)]",
    iconVariant: "teal",
  },
];

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down";
  trendValue?: string;
  className?: string;
  colorIndex?: number;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  trendValue,
  className,
  colorIndex,
}: MetricCardProps) {
  const idx = colorIndex ?? Math.floor(Math.random() * CARD_THEMES.length);
  const theme = CARD_THEMES[idx % CARD_THEMES.length];

  return (
    <Card
      className={cn(
        "card-hover-shadow hover:-translate-y-0.5 border-2 border-border",
        theme.borderClass,
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <IconChip variant={theme.iconVariant} size="md">
          <Icon className="h-4 w-4 text-white" />
        </IconChip>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
          {trend && trendValue && (
            <span
              className={cn(
                "flex items-center text-xs font-semibold px-2 py-0.5 rounded-full",
                trend === "up"
                  ? "text-[var(--dheka-green)] bg-[var(--dheka-green)]/10"
                  : "text-destructive bg-destructive/10"
              )}
            >
              {trend === "up" ? (
                <TrendingUp className="mr-0.5 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-0.5 h-3 w-3" />
              )}
              {trendValue}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
