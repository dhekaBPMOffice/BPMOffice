import { notFound } from "next/navigation";
import { Map } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { getTacticalPlanDocument, getDocumentActions } from "../actions";
import { DocumentDetail } from "../components/document-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlanoTaticoDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [docResult, actionsResult] = await Promise.all([
    getTacticalPlanDocument(id),
    getDocumentActions(id),
  ]);

  if (docResult.error || !docResult.data) {
    notFound();
  }

  return (
    <PageLayout
      title={docResult.data.title}
      description="Visualize e gerencie as ações do plano tático."
      icon={Map}
      backHref="/escritorio/estrategia/plano-tatico"
    >
      <DocumentDetail
        document={docResult.data}
        actions={actionsResult.data ?? []}
      />
    </PageLayout>
  );
}
