import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";

interface PageLayoutProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function PageLayout({
  title,
  description,
  icon: Icon,
  children,
  className,
  actions,
  backHref,
  backLabel,
}: PageLayoutProps) {
  return (
    <div
      className={cn("flex flex-col gap-[var(--spacing-block)]", className)}
      style={{ gap: "var(--spacing-block)" }}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "shrink-0 h-9 w-9"
              )}
              aria-label={backLabel ?? "Voltar"}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          {Icon && (
            <IconChip variant="teal" size="md" className="shrink-0">
              <Icon className="h-5 w-5 text-white" />
            </IconChip>
          )}
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
