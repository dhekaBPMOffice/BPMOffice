"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

const DASHBOARD_CONFIG_KEY = "bpm-dashboard-config";

export interface DashboardMetricConfig {
  id: string;
  label: string;
  visible: boolean;
}

const DEFAULT_METRICS: DashboardMetricConfig[] = [
  { id: "projetos-ativos", label: "Projetos Ativos", visible: true },
  { id: "processos-mapeados", label: "Processos Mapeados", visible: true },
  { id: "processos-melhorados", label: "Processos Melhorados", visible: true },
  { id: "processos-analisados", label: "Processos Analisados", visible: true },
  { id: "processos-implantados", label: "Processos Implantados", visible: true },
  { id: "acessos-usuario", label: "Acessos por Usuário", visible: true },
  { id: "uso-ia", label: "Uso de IA", visible: true },
];

function loadConfig(): DashboardMetricConfig[] {
  if (typeof window === "undefined") return DEFAULT_METRICS;
  try {
    const stored = localStorage.getItem(DASHBOARD_CONFIG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as DashboardMetricConfig[];
      return parsed.length > 0 ? parsed : DEFAULT_METRICS;
    }
  } catch {
    // ignore
  }
  return DEFAULT_METRICS;
}

function saveConfig(config: DashboardMetricConfig[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DASHBOARD_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

interface DashboardConfigProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: DashboardMetricConfig[];
  onConfigChange: (config: DashboardMetricConfig[]) => void;
}

export function DashboardConfig({
  open,
  onOpenChange,
  config,
  onConfigChange,
}: DashboardConfigProps) {
  const [localConfig, setLocalConfig] = useState<DashboardMetricConfig[]>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config, open]);

  const handleToggle = (id: string, visible: boolean) => {
    const updated = localConfig.map((m) =>
      m.id === id ? { ...m, visible } : m
    );
    setLocalConfig(updated);
  };

  const handleSave = () => {
    saveConfig(localConfig);
    onConfigChange(localConfig);
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_METRICS);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurar Dashboard
          </DialogTitle>
          <DialogDescription>
            Selecione quais métricas deseja exibir no dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {localConfig.map((metric) => (
            <div
              key={metric.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <Label htmlFor={`metric-${metric.id}`} className="cursor-pointer flex-1">
                {metric.label}
              </Label>
              <Switch
                id={`metric-${metric.id}`}
                checked={metric.visible}
                onCheckedChange={(checked) => handleToggle(metric.id, checked)}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Restaurar padrão
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { loadConfig, saveConfig, DEFAULT_METRICS, DASHBOARD_CONFIG_KEY };
