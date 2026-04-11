import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type CycleNavTab = {
  id: string;
  label: string;
  icon: LucideIcon;
};

/** Realça apenas a etapa selecionada (aba ativa na URL). */
export function ProcessWorkspaceCycleNav({
  tabs,
  activeTab,
}: {
  tabs: CycleNavTab[];
  activeTab: string;
}) {
  return (
    <div className="w-full overflow-x-auto pb-0.5 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="rounded-xl border border-border/80 bg-card p-1.5 shadow-[var(--shadow-card)]">
        <TabsList className="grid h-auto min-h-0 w-full min-w-[720px] grid-cols-7 items-stretch gap-0 rounded-lg bg-transparent p-0 sm:min-w-0">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;

            return (
              <div
                key={tab.id}
                className={cn(
                  "min-w-0 bg-card",
                  index > 0 && "border-l border-border/60"
                )}
              >
                <TabsTrigger
                  value={tab.id}
                  className={cn(
                    "flex h-full min-h-[5.75rem] w-full flex-col items-center justify-center gap-1.5 whitespace-normal rounded-none px-1.5 py-3 text-center shadow-none sm:min-h-[6rem]",
                    isSelected &&
                      "bg-[var(--identity-primary)]/14 font-semibold text-foreground ring-1 ring-inset ring-[var(--identity-primary)]/35",
                    !isSelected && "hover:bg-muted/45"
                  )}
                >
                  <Icon
                    className={cn("h-4 w-4 shrink-0 opacity-85", isSelected && "opacity-100")}
                    aria-hidden
                  />
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
