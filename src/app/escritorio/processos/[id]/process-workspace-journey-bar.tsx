"use client";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { isWorkspaceTabBpmComplete } from "@/lib/workspace-journey";
import type { BpmPhaseSlug } from "@/lib/bpm-phases";
import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";

export type JourneyBarTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  phases: readonly BpmPhaseSlug[];
};

export function ProcessWorkspaceJourneyBar({
  tabs,
  activeTab,
  secondaryHighlightTabId,
  bpmPhaseRows,
}: {
  tabs: JourneyBarTab[];
  activeTab: string;
  secondaryHighlightTabId: string | null;
  bpmPhaseRows: Array<{ phase: string; stage_status: string }>;
}) {
  return (
    <div className="w-full overflow-x-auto pb-0.5 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="rounded-xl border border-border/80 bg-card p-1.5 shadow-[var(--shadow-card)]">
        <TabsList className="flex h-auto min-h-0 w-full min-w-[720px] items-stretch gap-0 rounded-lg bg-transparent p-0 sm:min-w-0">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            const isSecondary =
              secondaryHighlightTabId === tab.id && tab.id !== activeTab;
            const hasBpm = tab.phases.length > 0;
            const isDone = hasBpm && isWorkspaceTabBpmComplete(tab.phases, bpmPhaseRows);
            const isNeutral = !hasBpm;
            const prevTab = index > 0 ? tabs[index - 1] : null;
            const prevDone =
              prevTab &&
              prevTab.phases.length > 0 &&
              isWorkspaceTabBpmComplete(prevTab.phases, bpmPhaseRows);

            return (
              <div key={tab.id} className="flex min-w-0 flex-1 items-stretch">
                {index > 0 ? (
                  <div
                    className={cn(
                      "mb-auto mt-auto h-1 w-2 min-w-[8px] shrink-0 self-center rounded-full sm:w-3",
                      prevDone ? "bg-[var(--identity-primary)]/60" : "bg-border/80"
                    )}
                    aria-hidden
                  />
                ) : null}
                <TabsTrigger
                  value={tab.id}
                  className={cn(
                    "flex min-h-[5.75rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 whitespace-normal rounded-lg px-1 py-2.5 text-center shadow-none transition-all duration-200 ease-out sm:min-h-[6rem]",
                    isNeutral && "opacity-90",
                    isSelected &&
                      "bg-[var(--identity-primary)]/16 font-semibold text-foreground ring-2 ring-[var(--identity-primary)]/45 ring-offset-2 ring-offset-card",
                    isSecondary &&
                      !isSelected &&
                      "bg-[var(--identity-primary)]/7 font-medium text-foreground ring-1 ring-[var(--identity-primary)]/25 ring-inset",
                    !isSelected &&
                      !isSecondary &&
                      "bg-transparent text-foreground hover:bg-muted/50",
                    isSelected && "hover:bg-[var(--identity-primary)]/18"
                  )}
                >
                  <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
                    {isDone ? (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--identity-primary)]/20 text-[var(--identity-primary)]">
                        <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                      </span>
                    ) : (
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 opacity-85",
                          isSelected && "opacity-100",
                          isNeutral && "opacity-70"
                        )}
                        aria-hidden
                      />
                    )}
                  </span>
                  <span className="w-full break-words px-0.5 text-center text-[11px] font-medium leading-snug text-foreground sm:text-xs">
                    {tab.label}
                  </span>
                </TabsTrigger>
              </div>
            );
          })}
        </TabsList>
      </div>
    </div>
  );
}
