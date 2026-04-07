"use client";

import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  BarChart3,
  Book,
  Briefcase,
  CalendarDays,
  Flag,
  Grid2x2,
  HardDrive,
  Headphones,
  History,
  Layers,
  Lightbulb,
  Map,
  Rocket,
  Search,
  Shapes,
  Shield,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { MANUAL_ICON_MAP } from "@/lib/manual/icons";

/** Ícones extra para páginas fora do manual (merge com MANUAL_ICON_MAP). */
const PAGE_LAYOUT_EXTRA_ICONS: Record<string, LucideIcon> = {
  BarChart3,
  Book,
  Briefcase,
  CalendarDays,
  Flag,
  Grid2x2,
  HardDrive,
  Headphones,
  History,
  Layers,
  Lightbulb,
  Map,
  Rocket,
  Search,
  Shapes,
  Shield,
  ShieldCheck,
  Sparkles,
  UserPlus,
};

/** Todos os ícones usados no cabeçalho (chaves = nomes exportados Lucide, serializáveis). */
export const PAGE_LAYOUT_ICONS: Record<string, LucideIcon> = {
  ...MANUAL_ICON_MAP,
  ...PAGE_LAYOUT_EXTRA_ICONS,
};

export type PageLayoutIconName = keyof typeof PAGE_LAYOUT_ICONS;

interface PageLayoutProps {
  title: string;
  description?: string;
  /** Nome do ícone Lucide (chave em PAGE_LAYOUT_ICONS), ex.: "ClipboardList". */
  iconName?: PageLayoutIconName;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  /** Quando ativo, pede confirmação antes de seguir o link «voltar» (ex.: alterações não guardadas). */
  backLeaveConfirm?: { active: boolean; message: string };
}

export function PageLayout({
  title,
  description,
  iconName,
  children,
  className,
  actions,
  backHref,
  backLabel,
  backLeaveConfirm,
}: PageLayoutProps) {
  const IconComponent = iconName ? PAGE_LAYOUT_ICONS[iconName as string] : undefined;

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
              onClick={(e) => {
                if (
                  backLeaveConfirm?.active &&
                  !window.confirm(backLeaveConfirm.message)
                ) {
                  e.preventDefault();
                }
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          {IconComponent && (
            <IconChip variant="teal" size="md" className="shrink-0">
              <IconComponent className="h-5 w-5 text-white" />
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
