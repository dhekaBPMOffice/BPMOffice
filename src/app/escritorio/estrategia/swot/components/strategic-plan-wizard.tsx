"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepIdentity } from "./step-identity";
import { StepSwot } from "./step-swot";
import { StepObjectives } from "./step-objectives";
import { StepActionPlan } from "./step-action-plan";
import { StepReview } from "./step-review";
import {
  getFullPlanData,
  updateStrategicPlan,
  type StrategicPlan,
  type SwotItem,
  type StrategicObjective,
  type TacticalPlan,
} from "../actions";

const STEPS = [
  { id: "identity", label: "IDENTIDADE" },
  { id: "swot", label: "SWOT" },
  { id: "objectives", label: "OBJETIVOS" },
  { id: "action-plan", label: "PLANO DE AÇÃO" },
  { id: "review", label: "REVISÃO" },
];

interface WizardProps {
  planId: string;
  initialPlan: StrategicPlan;
  initialStep?: number;
  importedFromImage?: boolean;
}

export function StrategicPlanWizard({ planId, initialPlan, initialStep = 0, importedFromImage = false }: WizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [plan, setPlan] = useState<StrategicPlan>(initialPlan);
  const [swotItems, setSwotItems] = useState<SwotItem[]>([]);
  const [objectives, setObjectives] = useState<StrategicObjective[]>([]);
  const [tacticalPlans, setTacticalPlans] = useState<TacticalPlan[]>([]);
  const [saving, setSaving] = useState(false);

  async function reload() {
    const data = await getFullPlanData(planId);
    if (data.plan) setPlan(data.plan);
    setSwotItems(data.swotItems);
    setObjectives(data.objectives);
    setTacticalPlans(data.tacticalPlans);
  }

  useEffect(() => {
    reload();
  }, [planId]);

  async function handleIdentitySave(updates: {
    name: string;
    year: number;
    mission: string;
    vision: string;
    values_text: string;
  }) {
    setSaving(true);
    await updateStrategicPlan(planId, updates);
    setPlan((prev) => ({ ...prev, ...updates }));
    setSaving(false);
  }

  function goNext() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }

  function goPrev() {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }

  function goToStep(index: number) {
    setCurrentStep(index);
  }

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/escritorio/estrategia/swot")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                {plan.name || "Criando Plano Estratégico"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {plan.year} &middot; {plan.status === "draft" ? "Rascunho" : plan.status === "active" ? "Ativo" : "Arquivado"}
              </p>
            </div>
          </div>
        </div>

        {/* Step tabs */}
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-0 overflow-x-auto">
            {STEPS.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => goToStep(index)}
                className={cn(
                  "flex-1 min-w-0 px-4 py-3 text-xs font-medium tracking-wider text-center transition-colors border-b-2 whitespace-nowrap",
                  index === currentStep
                    ? "border-teal-500 text-teal-700 bg-teal-50/50"
                    : index < currentStep
                    ? "border-teal-300 text-teal-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {index < currentStep && (
                  <Check className="h-3 w-3 inline mr-1" />
                )}
                {step.label}
              </button>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-teal-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {currentStep === 0 && (
          <StepIdentity
            plan={plan}
            onSave={handleIdentitySave}
            saving={saving}
          />
        )}

        {currentStep === 1 && (
          <StepSwot
            planId={planId}
            planName={plan.name}
            mission={plan.mission}
            vision={plan.vision}
            swotItems={swotItems}
            onReload={reload}
            importedFromImage={importedFromImage}
          />
        )}

        {currentStep === 2 && (
          <StepObjectives
            planId={planId}
            swotItems={swotItems}
            objectives={objectives}
            onReload={reload}
          />
        )}

        {currentStep === 3 && (
          <StepActionPlan
            planId={planId}
            objectives={objectives}
            tacticalPlans={tacticalPlans}
            onReload={reload}
          />
        )}

        {currentStep === 4 && (
          <StepReview
            plan={plan}
            swotItems={swotItems}
            objectives={objectives}
            tacticalPlans={tacticalPlans}
            planId={planId}
            onReload={reload}
          />
        )}
      </div>

      {/* Navigation footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior
          </Button>

          <span className="text-sm text-muted-foreground">
            Etapa {currentStep + 1} de {STEPS.length}
          </span>

          {currentStep < STEPS.length - 1 ? (
            <Button onClick={goNext} className="gap-2 bg-teal-600 hover:bg-teal-700">
              Próximo
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => router.push("/escritorio/estrategia/swot")}
              className="gap-2 bg-teal-600 hover:bg-teal-700"
            >
              <Check className="h-4 w-4" />
              Concluir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
