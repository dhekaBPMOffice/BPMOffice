import { createClient } from "@/lib/supabase/server";
import { DashboardClientWrapper } from "./dashboard-client-wrapper";

export default async function LeaderDashboardPage() {
  const supabase = await createClient();

  // Placeholder values - tables may not exist yet
  let metrics = {
    projetosAtivos: 0,
    processosMapeados: 0,
    processosMelhorados: 0,
    processosAnalisados: 0,
    processosImplantados: 0,
    acessosUsuario: 0,
    usoIA: 0,
  };

  let activityItems: { id: string; action: string; resourceType: string; resourceId?: string | null; details?: Record<string, unknown> | null; createdAt: string; userId?: string | null }[] = [];

  // Projetos Ativos (demands where status='active')
  const { count: projetosAtivos } = await supabase
    .from("demands")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");
  if (projetosAtivos !== null) metrics.projetosAtivos = projetosAtivos;

  const { count: processosMapeados } = await supabase
    .from("process_models")
    .select("*", { count: "exact", head: true });
  if (processosMapeados !== null) metrics.processosMapeados = processosMapeados;

  const { count: processosMelhorados } = await supabase
    .from("improvements")
    .select("*", { count: "exact", head: true });
  if (processosMelhorados !== null) metrics.processosMelhorados = processosMelhorados;

  const { count: processosAnalisados } = await supabase
    .from("analysis_results")
    .select("*", { count: "exact", head: true });
  if (processosAnalisados !== null) metrics.processosAnalisados = processosAnalisados;

  const { count: processosImplantados } = await supabase
    .from("implementation_plans")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed");
  if (processosImplantados !== null) metrics.processosImplantados = processosImplantados;

  const { count: acessosUsuario } = await supabase
    .from("audit_log")
    .select("*", { count: "exact", head: true });
  if (acessosUsuario !== null) metrics.acessosUsuario = acessosUsuario;

  const { count: usoIA } = await supabase
    .from("ai_interactions")
    .select("*", { count: "exact", head: true });
  if (usoIA !== null) metrics.usoIA = usoIA;

  const { data: auditData } = await supabase
    .from("audit_log")
    .select("id, action, resource_type, resource_id, details, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(10);

  if (auditData) {
    activityItems = auditData.map((row) => ({
      id: row.id,
      action: row.action ?? "",
      resourceType: row.resource_type ?? "",
      resourceId: row.resource_id,
      details: row.details,
      createdAt: row.created_at ?? new Date().toISOString(),
      userId: row.user_id,
    }));
  }

  return <DashboardClientWrapper metrics={metrics} activityItems={activityItems} />;
}
