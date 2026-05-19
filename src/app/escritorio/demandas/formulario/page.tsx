import { PageLayout } from "@/components/layout/page-layout";
import { getOfficeDemandFormData } from "./actions";
import { OfficeDemandFormBuilder } from "./office-demand-form-builder";

export default async function DemandasFormularioPage() {
  const result = await getOfficeDemandFormData();

  if ("error" in result && result.error) {
    return (
      <PageLayout
        title="Formulário de demandas"
        description="Configure o formulário público para abertura de demandas."
        iconName="ClipboardList"
        backHref="/escritorio/demandas"
      >
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      </PageLayout>
    );
  }

  if (!result.data) {
    return (
      <PageLayout
        title="Formulário de demandas"
        description="Configure o formulário público para abertura de demandas."
        iconName="ClipboardList"
        backHref="/escritorio/demandas"
      >
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Não foi possível carregar o formulário de demandas.
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Formulário de demandas"
      description="Personalize o formulário público usado por outras áreas para solicitar demandas ao escritório."
      iconName="ClipboardList"
      backHref="/escritorio/demandas"
    >
      <OfficeDemandFormBuilder initialData={result.data} />
    </PageLayout>
  );
}
