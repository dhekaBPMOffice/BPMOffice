"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  User,
  CalendarDays,
  Flag,
  BarChart3,
  Tag,
  Trash2,
} from "lucide-react";
import type { StrategicDataBundle } from "../actions";
import type { PlanConfig } from "./step-config";

export interface AIGeneratedAction {
  action: string;
  description: string;
  objective_title: string;
  responsible: string;
  deadline: string;
  priority: "alta" | "media" | "baixa";
  kpi: string;
  category: string;
}

const PRIORITY_STYLES: Record<string, { label: string; className: string }> = {
  alta: { label: "Alta", className: "bg-red-100 text-red-700" },
  media: { label: "Média", className: "bg-amber-100 text-amber-700" },
  baixa: { label: "Baixa", className: "bg-blue-100 text-blue-700" },
};

const CATEGORY_LABELS: Record<string, string> = {
  processos: "Processos",
  pessoas: "Pessoas",
  tecnologia: "Tecnologia",
  governanca: "Governança",
  capacitacao: "Capacitação",
  outro: "Outro",
};

interface StepPreviewProps {
  config: PlanConfig;
  strategicData: StrategicDataBundle;
  interviewAnswers: Record<string, string>;
  generatedActions: AIGeneratedAction[];
  onActionsChange: (actions: AIGeneratedAction[]) => void;
  isGenerating: boolean;
  generateError: string | null;
  onGenerate: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepPreview({
  generatedActions,
  onActionsChange,
  isGenerating,
  generateError,
  onGenerate,
  onBack,
  onNext,
}: StepPreviewProps) {
  const [removedIndices, setRemovedIndices] = useState<Set<number>>(new Set());

  function handleRemove(index: number) {
    const updated = generatedActions.filter((_, i) => i !== index);
    onActionsChange(updated);
    setRemovedIndices(new Set());
  }

  const groupedByObjective = new Map<string, { action: AIGeneratedAction; index: number }[]>();
  generatedActions.forEach((a, index) => {
    const key = a.objective_title || "Sem objetivo vinculado";
    const group = groupedByObjective.get(key) ?? [];
    group.push({ action: a, index });
    groupedByObjective.set(key, group);
  });

  if (isGenerating) {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Gerando Plano Tático</h2>
          <p className="text-muted-foreground">
            A IA está analisando seus dados e criando ações personalizadas...
          </p>
        </div>
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos...</p>
        </div>
      </div>
    );
  }

  if (generateError) {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Erro na Geração</h2>
          <p className="text-muted-foreground">
            Houve um problema ao gerar o plano tático.
          </p>
        </div>
        <Card className="max-w-xl mx-auto border-red-200 bg-red-50/30">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-red-800">{generateError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onGenerate}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Tentar Novamente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-center">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar à Entrevista
          </Button>
        </div>
      </div>
    );
  }

  if (generatedActions.length === 0) {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Preview do Plano</h2>
          <p className="text-muted-foreground">
            Clique para gerar as ações com IA.
          </p>
        </div>
        <div className="flex flex-col items-center gap-4 py-12">
          <Sparkles className="h-12 w-12 text-teal-300" />
          <Button onClick={onGenerate} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Gerar Plano com IA
          </Button>
        </div>
        <div className="flex justify-center">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Preview do Plano Tático</h2>
        <p className="text-muted-foreground">
          Revise as ações geradas pela IA. Você poderá editar tudo na próxima etapa.
        </p>
        <div className="flex justify-center gap-2 mt-2">
          <Badge variant="outline">{generatedActions.length} ações geradas</Badge>
          <Badge variant="outline">{groupedByObjective.size} objetivos vinculados</Badge>
        </div>
      </div>

      <div className="space-y-6 max-w-3xl mx-auto">
        {Array.from(groupedByObjective.entries()).map(([objectiveTitle, items]) => (
          <div key={objectiveTitle}>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-teal-500" />
              <h3 className="font-semibold text-foreground text-sm">{objectiveTitle}</h3>
              <Badge variant="outline" className="text-xs ml-auto">
                {items.length} ações
              </Badge>
            </div>

            <div className="space-y-2 pl-4 border-l-2 border-teal-100">
              {items.map(({ action: a, index }) => (
                <Card key={index} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="font-medium text-sm">{a.action}</p>
                        {a.description && (
                          <p className="text-xs text-muted-foreground">{a.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {a.responsible && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" /> {a.responsible}
                            </span>
                          )}
                          {a.deadline && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />{" "}
                              {new Date(a.deadline + "T00:00:00").toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          {a.priority && (
                            <Badge
                              className={`text-[10px] ${PRIORITY_STYLES[a.priority]?.className ?? ""}`}
                            >
                              <Flag className="h-2.5 w-2.5 mr-0.5" />
                              {PRIORITY_STYLES[a.priority]?.label ?? a.priority}
                            </Badge>
                          )}
                          {a.category && (
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />{" "}
                              {CATEGORY_LABELS[a.category] ?? a.category}
                            </span>
                          )}
                          {a.kpi && (
                            <span className="flex items-center gap-1">
                              <BarChart3 className="h-3 w-3" /> {a.kpi}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-600"
                        onClick={() => handleRemove(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onGenerate} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Regenerar
        </Button>
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={onNext} className="gap-2">
          Editar e Salvar
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
