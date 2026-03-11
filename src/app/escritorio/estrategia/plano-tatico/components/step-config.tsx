"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, ArrowRight } from "lucide-react";
import type { TacticalHorizon } from "../actions";

export interface PlanConfig {
  title: string;
  period_start: string;
  period_end: string;
  horizon: TacticalHorizon;
}

interface StepConfigProps {
  config: PlanConfig;
  onChange: (config: PlanConfig) => void;
  onNext: () => void;
}

export function StepConfig({ config, onChange, onNext }: StepConfigProps) {
  const isValid = config.title.trim().length > 0 && config.period_start && config.period_end;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Configuração do Plano</h2>
        <p className="text-muted-foreground">
          Defina o título, período e horizonte do plano tático.
        </p>
      </div>

      <Card className="max-w-xl mx-auto">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-5 w-5 text-teal-600" />
            <span className="font-semibold text-foreground">Informações Básicas</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título do Plano *</Label>
            <Input
              id="title"
              value={config.title}
              onChange={(e) => onChange({ ...config, title: e.target.value })}
              placeholder="Ex: Plano Tático Q2 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period_start">Início do Período *</Label>
              <Input
                id="period_start"
                type="date"
                value={config.period_start}
                onChange={(e) => onChange({ ...config, period_start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period_end">Fim do Período *</Label>
              <Input
                id="period_end"
                type="date"
                value={config.period_end}
                onChange={(e) => onChange({ ...config, period_end: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="horizon">Horizonte</Label>
            <Select
              id="horizon"
              value={config.horizon}
              onChange={(e) => onChange({ ...config, horizon: e.target.value as TacticalHorizon })}
            >
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button onClick={onNext} disabled={!isValid} className="gap-2">
          Próximo: Entrevista IA
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
