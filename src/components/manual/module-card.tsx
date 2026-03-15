"use client";

import Link from "next/link";
import { ChevronRight, BookOpen } from "lucide-react";
import type { ManualModule } from "@/lib/manual/config";
import { MANUAL_ICON_MAP } from "@/lib/manual/icons";

interface ModuleCardProps {
  module: ManualModule;
}

export function ModuleCard({ module }: ModuleCardProps) {
  const Icon = MANUAL_ICON_MAP[module.iconName] ?? BookOpen;

  return (
    <Link href={module.href}>
      <article
        className="group flex flex-col rounded-xl border border-border/40 bg-card p-5 transition-all hover:border-[var(--dheka-teal)]/40 hover:shadow-md"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--dheka-teal)]/10">
              <Icon className="h-5 w-5 text-[var(--dheka-teal)]" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground group-hover:text-[var(--dheka-teal)]">
                {module.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {module.shortDescription}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--dheka-teal)]" />
        </div>
      </article>
    </Link>
  );
}
