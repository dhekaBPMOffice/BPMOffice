"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { AISuggestButton } from "./ai-suggest-button";
import type { StrategicPlan } from "../actions";

interface StepIdentityProps {
  plan: StrategicPlan;
  onSave: (data: {
    name: string;
    year: number;
    mission: string;
    vision: string;
    values_text: string;
  }) => Promise<void>;
  saving: boolean;
}

export function StepIdentity({ plan, onSave, saving }: StepIdentityProps) {
  const [name, setName] = useState(plan.name);
  const [year, setYear] = useState(plan.year);
  const [mission, setMission] = useState(plan.mission ?? "");
  const [vision, setVision] = useState(plan.vision ?? "");
  const [valuesText, setValuesText] = useState(plan.values_text ?? "");

  function handleAIResult(text: string) {
    const lines = text.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.startsWith("missão:") || lower.startsWith("missao:")) {
        setMission(line.replace(/^miss[ãa]o:\s*/i, "").trim());
      } else if (lower.startsWith("visão:") || lower.startsWith("visao:")) {
        setVision(line.replace(/^vis[ãa]o:\s*/i, "").trim());
      } else if (lower.startsWith("valores:")) {
        setValuesText(line.replace(/^valores:\s*/i, "").trim());
      }
    }
  }

  async function handleSave() {
    await onSave({
      name,
      year,
      mission,
      vision,
      values_text: valuesText,
    });
  }

  const aiContext = `Nome do escritório: ${name}\nAno de referência: ${year}`;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Identidade do Negócio</h2>
        <p className="text-muted-foreground">
          Defina a base do seu planejamento
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <Label className="font-semibold">Nome do Studio</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Escritório de Processos"
          />
        </div>

        <div className="space-y-2">
          <Label className="font-semibold">Ano de Referência</Label>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
            min={2020}
            max={2040}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="font-semibold">Missão, Visão e Valores</Label>
          <AISuggestButton
            phase="strategic_identity"
            context={aiContext}
            onResult={handleAIResult}
          />
        </div>

        <div className="space-y-2">
          <Label>Missão</Label>
          <Textarea
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            placeholder="Qual o propósito do escritório?"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Visão</Label>
          <Textarea
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            placeholder="Onde o escritório quer chegar?"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Valores</Label>
          <Textarea
            value={valuesText}
            onChange={(e) => setValuesText(e.target.value)}
            placeholder="Ex: Inovação, Excelência, Colaboração..."
            rows={2}
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="gap-2 bg-teal-600 hover:bg-teal-700"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Identidade"}
          </Button>
        </div>
      </div>
    </div>
  );
}
