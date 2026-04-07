import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageLayout } from "@/components/layout/page-layout";
import { Flag } from "lucide-react";
import { EncerramentoPhase } from "./encerramento-phase";

export default async function EncerramentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole(["leader", "user"]);
  const supabase = await createClient();

  if (!profile.office_id) notFound();

  const { data: demand } = await supabase
    .from("demands")
    .select("id, title")
    .eq("id", id)
    .eq("office_id", profile.office_id)
    .single();

  if (!demand) notFound();

  return (
    <PageLayout
      title={`Encerramento - ${demand.title}`}
      iconName="Flag"
      backHref={`/escritorio/demandas/${id}`}
    >
      <EncerramentoPhase demandId={id} officeId={profile.office_id} />
    </PageLayout>
  );
}
