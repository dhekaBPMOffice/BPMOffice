"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CadeiaValorClient } from "./cadeia-valor-client";
import { GestaoProcessosTab, type GestaoProcessosTabProps } from "./gestao-processos-tab";
import type { ProcessItem } from "@/types/cadeia-valor";
import { Settings2, ClipboardList } from "lucide-react";

function CadeiaValorTabsInner({
  initialTab,
  cadeiaProcesses,
  processListKey,
  gestaoProps,
}: {
  initialTab: "configuracao" | "gestao";
  cadeiaProcesses: ProcessItem[];
  processListKey: string;
  gestaoProps: GestaoProcessosTabProps;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawTab = searchParams.get("aba");
  const activeTab = rawTab === "configuracao" || rawTab === "gestao" ? rawTab : initialTab;

  function onTabChange(value: string) {
    const params = new URLSearchParams();
    params.set("aba", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <div className="mb-6">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="configuracao" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Configuração da Cadeia
          </TabsTrigger>
          <TabsTrigger value="gestao" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Gestão de Processos
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="configuracao" className="mt-0">
        <CadeiaValorClient key={processListKey} initialProcesses={cadeiaProcesses} />
      </TabsContent>

      <TabsContent value="gestao" className="mt-0">
        <GestaoProcessosTab {...gestaoProps} />
      </TabsContent>
    </Tabs>
  );
}

export function CadeiaValorTabs(props: {
  initialTab: "configuracao" | "gestao";
  cadeiaProcesses: ProcessItem[];
  processListKey: string;
  gestaoProps: GestaoProcessosTabProps;
}) {
  return (
    <Suspense>
      <CadeiaValorTabsInner {...props} />
    </Suspense>
  );
}
