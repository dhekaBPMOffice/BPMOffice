"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { StrategicPlanWizard } from "../components/strategic-plan-wizard";
import { getStrategicPlan, type StrategicPlan } from "../actions";

export default function EditarPlanoPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = params.planId as string;
  const stepParam = searchParams.get("step");
  const initialStep = stepParam ? Math.min(Math.max(0, parseInt(stepParam, 10) || 0), 4) : 0;
  const importedFromImage = searchParams.get("imported") === "1";
  const [plan, setPlan] = useState<StrategicPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const result = await getStrategicPlan(planId);
      if (result.error || !result.data) {
        setError(result.error ?? "Plano não encontrado.");
        setLoading(false);
        return;
      }
      setPlan(result.data);
      setLoading(false);
    }
    load();
  }, [planId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Carregando plano...</p>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error ?? "Plano não encontrado."}</p>
          <button
            onClick={() => router.push("/escritorio/estrategia/swot")}
            className="text-sm text-teal-600 hover:underline"
          >
            Voltar ao Planejamento Estratégico
          </button>
        </div>
      </div>
    );
  }

  return <StrategicPlanWizard planId={planId} initialPlan={plan} initialStep={initialStep} importedFromImage={importedFromImage} />;
}
