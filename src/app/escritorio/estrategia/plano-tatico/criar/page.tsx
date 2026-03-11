import { Map } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { getAllStrategicData } from "../actions";
import { TacticalPlanWizard } from "../components/tactical-plan-wizard";

export default async function CriarPlanoTaticoPage() {
  const { data: strategicData, error } = await getAllStrategicData();

  return (
    <PageLayout
      title="Criar Plano Tático"
      description="Cadastre um novo plano tático alinhado à estratégia com auxílio de IA."
      icon={Map}
      backHref="/escritorio/estrategia/plano-tatico"
    >
      {error ? (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Erro ao carregar dados estratégicos: {error}
        </div>
      ) : (
        <TacticalPlanWizard
          strategicData={strategicData ?? {
            swotItems: [],
            strategicObjectives: [],
            officeObjectives: [],
            portfolioServices: [],
          }}
        />
      )}
    </PageLayout>
  );
}
