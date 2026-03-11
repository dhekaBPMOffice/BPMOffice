"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Settings, MessageSquare, Eye, PenLine } from "lucide-react";
import { StepConfig, type PlanConfig } from "./step-config";
import { StepInterview } from "./step-interview";
import { StepPreview, type AIGeneratedAction } from "./step-preview";
import { StepEdit } from "./step-edit";
import {
  createTacticalPlanDocument,
  updateTacticalPlanDocument,
  bulkCreateDocumentActions,
  type StrategicDataBundle,
  type TacticalPriority,
  type TacticalCategory,
} from "../actions";

const STEPS = [
  { label: "Configuração", icon: Settings },
  { label: "Entrevista", icon: MessageSquare },
  { label: "Preview", icon: Eye },
  { label: "Editar & Salvar", icon: PenLine },
];

interface TacticalPlanWizardProps {
  strategicData: StrategicDataBundle;
}

export function TacticalPlanWizard({ strategicData }: TacticalPlanWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const [config, setConfig] = useState<PlanConfig>({
    title: "",
    period_start: "",
    period_end: "",
    horizon: "trimestral",
  });

  const [interviewAnswers, setInterviewAnswers] = useState<Record<string, string>>({});
  const [generatedActions, setGeneratedActions] = useState<AIGeneratedAction[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch("/api/estrategia/plano-tatico/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategicData,
          interviewAnswers,
          config,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar plano.");

      if (data.parsed?.actions) {
        setGeneratedActions(data.parsed.actions);
      } else {
        throw new Error(
          "A IA não retornou o plano no formato esperado. Tente novamente."
        );
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Erro ao gerar plano.");
    } finally {
      setIsGenerating(false);
    }
  }, [strategicData, interviewAnswers, config]);

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);

    try {
      const docResult = await createTacticalPlanDocument({
        title: config.title,
        period_start: config.period_start,
        period_end: config.period_end,
        horizon: config.horizon,
      });

      if (docResult.error || !docResult.data) {
        throw new Error(docResult.error ?? "Erro ao criar documento.");
      }

      const documentId = docResult.data.id;

      await updateTacticalPlanDocument(documentId, {
        ai_context: { interviewAnswers, generatedAt: new Date().toISOString() },
      });

      const allObjectives = [
        ...strategicData.strategicObjectives.map((o) => ({
          id: o.id,
          title: o.title,
          type: "strategic" as const,
        })),
        ...strategicData.officeObjectives.map((o) => ({
          id: o.id,
          title: o.title,
          type: "office" as const,
        })),
      ];

      const fallbackObjectiveId = allObjectives[0]?.id;

      const actionsToInsert = generatedActions.map((a) => {
        const matchedObj = allObjectives.find(
          (o) =>
            o.title.toLowerCase() === a.objective_title.toLowerCase() ||
            o.title.toLowerCase().includes(a.objective_title.toLowerCase().slice(0, 20)) ||
            a.objective_title.toLowerCase().includes(o.title.toLowerCase().slice(0, 20))
        );

        const isStrategic = matchedObj?.type === "strategic";
        const objectiveId = isStrategic
          ? matchedObj.id
          : fallbackObjectiveId ?? matchedObj?.id ?? "";
        const officeObjectiveId =
          matchedObj?.type === "office" ? matchedObj.id : null;

        return {
          objective_id: objectiveId,
          office_objective_id: officeObjectiveId,
          action: a.action,
          description: a.description || undefined,
          responsible: a.responsible || undefined,
          deadline: a.deadline || undefined,
          priority: (a.priority || "media") as TacticalPriority,
          kpi: a.kpi || undefined,
          category: (a.category || undefined) as TacticalCategory | undefined,
        };
      });

      const validActions = actionsToInsert.filter((a) => a.objective_id);

      if (validActions.length > 0) {
        const bulkResult = await bulkCreateDocumentActions(documentId, validActions);
        if (bulkResult.error) {
          throw new Error(bulkResult.error);
        }
      }

      await updateTacticalPlanDocument(documentId, { status: "active" });

      router.push(`/escritorio/estrategia/plano-tatico/${documentId}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar plano.");
    } finally {
      setIsSaving(false);
    }
  }

  function goToStep2() {
    setCurrentStep(1);
  }

  function goToStep3() {
    setCurrentStep(2);
    if (generatedActions.length === 0) {
      handleGenerate();
    }
  }

  return (
    <div className="space-y-8">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;
          return (
            <div key={i} className="flex items-center gap-1 sm:gap-2">
              {i > 0 && (
                <div
                  className={`h-px w-4 sm:w-8 ${
                    isCompleted ? "bg-teal-500" : "bg-border"
                  }`}
                />
              )}
              <div
                className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-teal-100 text-teal-800 border border-teal-300"
                    : isCompleted
                    ? "bg-teal-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{step.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      {currentStep === 0 && (
        <StepConfig config={config} onChange={setConfig} onNext={goToStep2} />
      )}

      {currentStep === 1 && (
        <StepInterview
          strategicData={strategicData}
          answers={interviewAnswers}
          onAnswersChange={setInterviewAnswers}
          onBack={() => setCurrentStep(0)}
          onNext={goToStep3}
        />
      )}

      {currentStep === 2 && (
        <StepPreview
          config={config}
          strategicData={strategicData}
          interviewAnswers={interviewAnswers}
          generatedActions={generatedActions}
          onActionsChange={setGeneratedActions}
          isGenerating={isGenerating}
          generateError={generateError}
          onGenerate={handleGenerate}
          onBack={() => setCurrentStep(1)}
          onNext={() => setCurrentStep(3)}
        />
      )}

      {currentStep === 3 && (
        <StepEdit
          actions={generatedActions}
          onActionsChange={setGeneratedActions}
          onBack={() => setCurrentStep(2)}
          onSave={handleSave}
          isSaving={isSaving}
          saveError={saveError}
        />
      )}
    </div>
  );
}
