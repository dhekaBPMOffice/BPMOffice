"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/page-layout";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ActivityFeed, type ActivityItem } from "@/components/dashboard/activity-feed";
import { CriticalityChart } from "@/components/dashboard/criticality-chart";
import {
  DashboardConfig,
  loadConfig,
  type DashboardMetricConfig,
} from "@/components/dashboard/dashboard-config";
import {
  ClipboardList,
  FileSearch,
  TrendingUp,
  CheckCircle2,
  Wrench,
  Users,
  Bot,
  Settings,
} from "lucide-react";

export interface DashboardMetrics {
  projetosAtivos: number;
  processosMapeados: number;
  processosMelhorados: number;
  processosAnalisados: number;
  processosImplantados: number;
  acessosUsuario: number;
  usoIA: number;
}

interface DashboardContentProps {
  metrics: DashboardMetrics;
  activityItems: ActivityItem[];
}

const METRIC_MAP: Record<
  string,
  { key: keyof DashboardMetrics; label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  "projetos-ativos": {
    key: "projetosAtivos",
    label: "Projetos Ativos",
    icon: ClipboardList,
  },
  "processos-mapeados": {
    key: "processosMapeados",
    label: "Processos Mapeados",
    icon: FileSearch,
  },
  "processos-melhorados": {
    key: "processosMelhorados",
    label: "Processos Melhorados",
    icon: TrendingUp,
  },
  "processos-analisados": {
    key: "processosAnalisados",
    label: "Processos Analisados",
    icon: Wrench,
  },
  "processos-implantados": {
    key: "processosImplantados",
    label: "Processos Implantados",
    icon: CheckCircle2,
  },
  "acessos-usuario": {
    key: "acessosUsuario",
    label: "Acessos por Usuário",
    icon: Users,
  },
  "uso-ia": {
    key: "usoIA",
    label: "Uso de IA",
    icon: Bot,
  },
};

export function DashboardContent({ metrics, activityItems }: DashboardContentProps) {
  const [configOpen, setConfigOpen] = useState(false);
  const [config, setConfig] = useState<DashboardMetricConfig[]>([]);

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  const visibleMetrics = config
    .filter((m) => m.visible)
    .map((m) => METRIC_MAP[m.id])
    .filter(Boolean);

  return (
    <PageLayout
      title="Dashboard"
      description="Visão geral do seu escritório de processos."
      actions={
        <Button
          variant="outline"
          size="icon"
          onClick={() => setConfigOpen(true)}
          title="Configurar dashboard"
        >
          <Settings className="h-5 w-5" />
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: "var(--spacing-block)" }}>
        {visibleMetrics.map(({ key, label, icon }, index) => (
          <MetricCard
            key={key}
            label={label}
            value={metrics[key]}
            icon={icon}
            colorIndex={index}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3" style={{ gap: "var(--spacing-block)" }}>
        <div className="lg:col-span-2">
          <CriticalityChart />
        </div>
        <div>
          <ActivityFeed items={activityItems} maxItems={10} />
        </div>
      </div>

      <DashboardConfig
        open={configOpen}
        onOpenChange={setConfigOpen}
        config={config}
        onConfigChange={setConfig}
      />
    </PageLayout>
  );
}
