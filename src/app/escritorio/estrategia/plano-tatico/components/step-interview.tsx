"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  ShieldAlert,
  Target,
  Briefcase,
} from "lucide-react";
import type { StrategicDataBundle } from "../actions";

const INTERVIEW_QUESTIONS = [
  {
    id: "priority_objectives",
    label: "Quais objetivos são prioridade para este período?",
    placeholder:
      "Liste os objetivos que devem receber mais atenção neste ciclo, ou descreva as áreas prioritárias...",
  },
  {
    id: "resource_constraints",
    label: "Há restrições de orçamento, equipe ou recursos?",
    placeholder:
      "Ex: Equipe reduzida, orçamento limitado para novas ferramentas, dependência de aprovação...",
  },
  {
    id: "ongoing_initiatives",
    label: "Existem iniciativas já em andamento que devam ser incorporadas?",
    placeholder:
      "Ex: Projeto de automação iniciado no trimestre anterior, treinamento em andamento...",
  },
  {
    id: "portfolio_focus",
    label: "Quais serviços do portfólio precisam de mais atenção?",
    placeholder:
      "Ex: Mapeamento de processos com alta demanda, necessidade de expandir consultoria...",
  },
  {
    id: "additional_context",
    label: "Há algum desafio ou contexto específico não coberto pela SWOT?",
    placeholder:
      "Ex: Mudança de liderança, nova regulamentação, fusão de equipes, demanda urgente...",
  },
];

interface StepInterviewProps {
  strategicData: StrategicDataBundle;
  answers: Record<string, string>;
  onAnswersChange: (answers: Record<string, string>) => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepInterview({
  strategicData,
  answers,
  onAnswersChange,
  onBack,
  onNext,
}: StepInterviewProps) {
  const [expanded, setExpanded] = useState(false);

  const swotCount = strategicData.swotItems.length;
  const stratObjCount = strategicData.strategicObjectives.length;
  const offObjCount = strategicData.officeObjectives.length;
  const portfolioCount = strategicData.portfolioServices.length;
  const hasData = swotCount + stratObjCount + offObjCount + portfolioCount > 0;

  const strengths = strategicData.swotItems.filter((i) => i.type === "strength");
  const weaknesses = strategicData.swotItems.filter((i) => i.type === "weakness");
  const opportunities = strategicData.swotItems.filter((i) => i.type === "opportunity");
  const threats = strategicData.swotItems.filter((i) => i.type === "threat");

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Entrevista Guiada</h2>
        <p className="text-muted-foreground">
          A IA analisará seus dados estratégicos. Responda as perguntas para refinar o plano.
        </p>
      </div>

      {/* Data summary */}
      <Card className="max-w-3xl mx-auto border-teal-200 bg-teal-50/30">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-teal-600" />
            <span className="font-semibold text-foreground">Dados Estratégicos Encontrados</span>
          </div>

          {!hasData ? (
            <p className="text-sm text-muted-foreground">
              Nenhum dado estratégico encontrado. Cadastre informações na SWOT, Objetivos ou
              Portfólio antes de gerar o plano.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                {swotCount > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <TrendingUp className="h-3 w-3" /> {swotCount} itens SWOT
                  </Badge>
                )}
                {stratObjCount > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <Target className="h-3 w-3" /> {stratObjCount} obj. estratégicos
                  </Badge>
                )}
                {offObjCount > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <Target className="h-3 w-3" /> {offObjCount} obj. do escritório
                  </Badge>
                )}
                {portfolioCount > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <Briefcase className="h-3 w-3" /> {portfolioCount} serviços
                  </Badge>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-teal-700"
              >
                {expanded ? "Ocultar detalhes" : "Ver detalhes dos dados"}
              </Button>

              {expanded && (
                <div className="mt-3 space-y-3 text-sm">
                  {strengths.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 font-medium text-emerald-700 mb-1">
                        <TrendingUp className="h-3.5 w-3.5" /> Forças
                      </div>
                      <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                        {strengths.map((s, i) => (
                          <li key={i}>{s.content}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {weaknesses.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 font-medium text-red-700 mb-1">
                        <TrendingDown className="h-3.5 w-3.5" /> Fraquezas
                      </div>
                      <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                        {weaknesses.map((s, i) => (
                          <li key={i}>{s.content}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {opportunities.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 font-medium text-blue-700 mb-1">
                        <Lightbulb className="h-3.5 w-3.5" /> Oportunidades
                      </div>
                      <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                        {opportunities.map((s, i) => (
                          <li key={i}>{s.content}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {threats.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 font-medium text-amber-700 mb-1">
                        <ShieldAlert className="h-3.5 w-3.5" /> Ameaças
                      </div>
                      <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                        {threats.map((s, i) => (
                          <li key={i}>{s.content}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {strategicData.strategicObjectives.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 font-medium text-foreground mb-1">
                        <Target className="h-3.5 w-3.5" /> Objetivos Estratégicos
                      </div>
                      <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                        {strategicData.strategicObjectives.map((o) => (
                          <li key={o.id}>{o.title}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {strategicData.officeObjectives.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 font-medium text-foreground mb-1">
                        <Target className="h-3.5 w-3.5" /> Objetivos do Escritório
                      </div>
                      <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                        {strategicData.officeObjectives.map((o) => (
                          <li key={o.id}>
                            <Badge variant="outline" className="text-[10px] mr-1">
                              {o.type === "primary" ? "Primário" : "Secundário"}
                            </Badge>
                            {o.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {strategicData.portfolioServices.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 font-medium text-foreground mb-1">
                        <Briefcase className="h-3.5 w-3.5" /> Serviços do Portfólio
                      </div>
                      <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                        {strategicData.portfolioServices.map((s, i) => (
                          <li key={i}>
                            {s.name}
                            {s.demand_level && (
                              <span className="text-xs ml-1">(demanda: {s.demand_level})</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="max-w-3xl mx-auto space-y-5">
        {INTERVIEW_QUESTIONS.map((q) => (
          <div key={q.id} className="space-y-2">
            <Label htmlFor={q.id} className="text-sm font-medium">
              {q.label}
            </Label>
            <Textarea
              id={q.id}
              value={answers[q.id] ?? ""}
              onChange={(e) =>
                onAnswersChange({ ...answers, [q.id]: e.target.value })
              }
              placeholder={q.placeholder}
              rows={3}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={onNext} className="gap-2">
          Gerar Plano com IA
          <Sparkles className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
