import { Building2, Users, FileText, Activity, LayoutDashboard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageLayout } from "@/components/layout/page-layout";
import { MetricCard } from "@/components/dashboard/metric-card";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: officeCount },
    { count: userCount },
    { count: planCount },
  ] = await Promise.all([
    supabase.from("offices").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).neq("role", "admin_master"),
    supabase.from("plans").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Escritórios", value: officeCount ?? 0, icon: Building2 },
    { label: "Usuários Totais", value: userCount ?? 0, icon: Users },
    { label: "Planos Ativos", value: planCount ?? 0, icon: FileText },
    { label: "Atividade Recente", value: "—", icon: Activity },
  ];

  return (
    <PageLayout
      title="Painel do Administrador"
      description="Visão geral da plataforma BPM Office."
      iconName="LayoutDashboard"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" style={{ gap: "var(--spacing-block)" }}>
        {stats.map((stat, idx) => (
          <MetricCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            colorIndex={idx}
          />
        ))}
      </div>
    </PageLayout>
  );
}
