import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageLayout } from "@/components/layout/page-layout";
import { ClipboardList } from "lucide-react";
import { ProcessManagementClient } from "./process-management-client";
import { normalizeProcessTypeOptions } from "@/lib/process-type-options";

export default async function OfficeProcessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole(["leader"]);
  const supabase = await createClient();

  if (!profile.office_id) {
    return (
      <PageLayout title="Processo" iconName="ClipboardList" backHref="/escritorio/estrategia/cadeia-valor?aba=gestao">
        <p className="text-destructive">Escritório não encontrado.</p>
      </PageLayout>
    );
  }

  const [
    { data: officeProcess, error: processError },
    { data: ownerOptions },
    { data: checklistItems },
    { data: attachments },
    { data: history },
    { data: bpmPhases },
  ] = await Promise.all([
    supabase
      .from("office_processes")
      .select("*")
      .eq("id", id)
      .eq("office_id", profile.office_id)
      .single(),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("office_id", profile.office_id)
      .order("full_name", { ascending: true }),
    supabase
      .from("office_process_checklist_items")
      .select("id, title, description, is_completed")
      .eq("office_process_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("office_process_attachments")
      .select("id, title, attachment_url, attachment_type, created_at")
      .eq("office_process_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("office_process_history")
      .select("id, description, event_type, created_at")
      .eq("office_process_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("office_process_bpm_phases")
      .select("id, phase, stage_status, completed_at, updated_at")
      .eq("office_process_id", id),
  ]);

  if (processError || !officeProcess) {
    notFound();
  }

  const { data: officeCfg } = await supabase
    .from("office_config")
    .select("process_type_options")
    .eq("office_id", profile.office_id)
    .maybeSingle();

  const processTypeOptions = normalizeProcessTypeOptions(
    (officeCfg?.process_type_options as string[] | undefined) ?? undefined
  );

  return (
    <PageLayout
      title={officeProcess.name}
      description={
        officeProcess.vc_tipo_label?.trim() ||
        officeProcess.category?.trim() ||
        "Gestão completa do processo do escritório."
      }
      iconName="ClipboardList"
      backHref="/escritorio/estrategia/cadeia-valor?aba=gestao"
      backLabel="Voltar para Gestão de Processos"
    >
      <ProcessManagementClient
        officeProcess={officeProcess}
        processTypeOptions={processTypeOptions}
        ownerOptions={ownerOptions ?? []}
        checklistItems={checklistItems ?? []}
        attachments={attachments ?? []}
        history={history ?? []}
        bpmPhases={bpmPhases ?? []}
      />
    </PageLayout>
  );
}
