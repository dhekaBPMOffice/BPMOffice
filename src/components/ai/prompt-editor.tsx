"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";

const PHASES: { key: string; label: string }[] = [
  { key: "levantamento", label: "Levantamento" },
  { key: "modelagem", label: "Modelagem" },
  { key: "analise", label: "Análise" },
  { key: "melhorias", label: "Melhorias" },
  { key: "implantacao", label: "Implantação" },
  { key: "encerramento", label: "Encerramento" },
  { key: "swot", label: "SWOT" },
  { key: "strategic_identity", label: "Identidade Estratégica" },
  { key: "strategic_objectives", label: "Objetivos Estratégicos" },
  { key: "tactical_plan", label: "Plano Tático" },
  { key: "cadeia_valor", label: "Cadeia de Valor" },
  { key: "plano_tatico", label: "Plano Tático (legado)" },
];

interface PromptEditorProps {
  phase: string;
  value: string;
  onChange: (value: string) => void;
  onPhaseChange?: (phase: string) => void;
  phases?: { key: string; label: string }[];
  placeholder?: string;
}

export function PromptEditor({
  phase,
  value,
  onChange,
  onPhaseChange,
  phases = PHASES,
  placeholder = "Digite o prompt para esta fase...",
}: PromptEditorProps) {
  const [previewInput] = useState("Exemplo de dados de entrada para preview...");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editor de Prompt</CardTitle>
        <CardDescription>
          Edite o prompt utilizado pela IA para esta fase. Use a variável de contexto conforme necessário.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {onPhaseChange && (
          <div className="space-y-2">
            <Label>Fase</Label>
            <Select
              value={phase}
              onChange={(e) => onPhaseChange(e.target.value)}
            >
              {phases.map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Prompt</Label>
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={8}
            className="font-mono text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label>Preview (como ficará com dados de entrada)</Label>
          <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Prompt completo:</p>
            <pre className="whitespace-pre-wrap break-words">
              {value || placeholder}
              {"\n\n"}
              Dados de entrada:
              {"\n"}
              {previewInput}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
