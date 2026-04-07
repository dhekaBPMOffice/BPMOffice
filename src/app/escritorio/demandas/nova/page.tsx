import { requireRole } from "@/lib/auth";
import { PageLayout } from "@/components/layout/page-layout";
import { ClipboardList } from "lucide-react";
import { NovaDemandaForm } from "./nova-demanda-form";

export default async function NovaDemandaPage() {
  await requireRole(["leader", "user"]);

  return (
    <PageLayout
      title="Nova Demanda"
      description="Crie uma nova demanda para o ciclo BPM."
      iconName="ClipboardList"
      backHref="/escritorio/demandas"
    >
      <NovaDemandaForm />
    </PageLayout>
  );
}
