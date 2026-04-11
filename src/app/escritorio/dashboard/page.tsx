import { PageLayout } from "@/components/layout/page-layout";
import { requireRole } from "@/lib/auth";
import { getAllowedModuleIds } from "@/lib/manual";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";
import { DashboardClientWrapper } from "./dashboard-client-wrapper";
import type {
  DashboardHomeData,
  DashboardIconName,
  DashboardMetricItem,
  DashboardQuickAction,
} from "./dashboard-content";

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PHASE_LABELS: Record<string, string> = {
  levantamento: "Levantamento",
  modelagem: "Modelagem",
  analise: "Análise",
  analysis: "Análise",
  melhorias: "Melhorias",
  improvement: "Melhorias",
  implementacao: "Implantação",
  implementation: "Implantação",
  encerramento: "Encerramento",
  fechamento: "Encerramento",
  closure: "Encerramento",
};

type ShortcutConfig = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: DashboardIconName;
  roles: UserRole[];
  moduleId: string | null;
};

const SHORTCUT_CATALOG: ShortcutConfig[] = [
  {
    id: "visao-geral",
    label: "Área de Trabalho",
    description: "Acompanhar sua visão operacional pessoal.",
    href: "/escritorio/trabalho",
    icon: "LayoutDashboard",
    roles: ["user"],
    moduleId: "trabalho",
  },
  {
    id: "demandas",
    label: "Demandas",
    description: "Acompanhar o fluxo BPM e prioridades.",
    href: "/escritorio/demandas",
    icon: "ClipboardList",
    roles: ["leader", "user"],
    moduleId: "demandas",
  },
  {
    id: "nova-demanda",
    label: "Nova Demanda",
    description: "Iniciar um novo projeto BPM.",
    href: "/escritorio/demandas/nova",
    icon: "PlusCircle",
    roles: ["leader"],
    moduleId: "demandas",
  },
  {
    id: "estrategia",
    label: "Estratégia",
    description: "Acessar cadeia de valor e objetivos.",
    href: "/escritorio/estrategia",
    icon: "Target",
    roles: ["leader"],
    moduleId: "estrategia",
  },
  {
    id: "conhecimento",
    label: "Conhecimento",
    description: "Consultar materiais e melhores práticas.",
    href: "/escritorio/conhecimento",
    icon: "BookOpen",
    roles: ["leader", "user"],
    moduleId: "conhecimento",
  },
  {
    id: "capacitacao",
    label: "Capacitação",
    description: "Ver trilhas e treinamentos disponíveis.",
    href: "/escritorio/capacitacao",
    icon: "GraduationCap",
    roles: ["leader", "user"],
    moduleId: "capacitacao",
  },
  {
    id: "usuarios",
    label: "Usuários",
    description: "Gerenciar colaboradores e permissões.",
    href: "/escritorio/usuarios",
    icon: "Users",
    roles: ["leader"],
    moduleId: "usuarios",
  },
  {
    id: "manual",
    label: "Manual",
    description: "Revisar orientações e fluxos do sistema.",
    href: "/escritorio/manual",
    icon: "HelpCircle",
    roles: ["leader", "user"],
    moduleId: null,
  },
  {
    id: "configuracoes",
    label: "Configurações",
    description: "Ajustar parâmetros e preferências.",
    href: "/escritorio/configuracoes",
    icon: "Settings",
    roles: ["leader"],
    moduleId: "configuracoes",
  },
  {
    id: "notificacoes",
    label: "Notificações",
    description: "Consultar alertas e comunicados recebidos.",
    href: "/escritorio/notificacoes",
    icon: "Bell",
    roles: ["leader", "user"],
    moduleId: null,
  },
];

type DemandRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  assigned_profile?: { full_name?: string } | { full_name?: string }[] | null;
};

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

type AIInteractionRow = {
  id: string;
  phase: string;
  provider: string;
  output_data: string | null;
  created_at: string;
};

function getFirstName(fullName: string | null | undefined) {
  const s = (fullName ?? "").trim();
  return s.split(/\s+/)[0] || "Equipe";
}

function getPriorityLabel(priority: string) {
  const labels: Record<string, string> = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
    urgent: "Urgente",
  };
  return labels[priority] ?? priority;
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Em andamento",
    paused: "Pausada",
    completed: "Concluída",
    cancelled: "Cancelada",
  };
  return labels[status] ?? status;
}

function getAssignedName(assignedProfile: DemandRow["assigned_profile"]) {
  if (!assignedProfile) return null;
  if (Array.isArray(assignedProfile)) {
    return assignedProfile[0]?.full_name ?? null;
  }
  return assignedProfile.full_name ?? null;
}

function summarizeText(text: string | null | undefined, fallback: string) {
  if (!text) return fallback;

  const normalized = text
    .split("\n")
    .map((line) => line.replace(/^[-#*\s>]+/, "").trim())
    .find(Boolean);

  if (!normalized) return fallback;
  return normalized.length > 160 ? `${normalized.slice(0, 157)}...` : normalized;
}

function buildCriticalityData(rows: Array<{ criticality_level: string | null }> | null) {
  const totals = {
    baixa: 0,
    media: 0,
    alta: 0,
    critica: 0,
  };

  for (const row of rows ?? []) {
    const level = row.criticality_level;
    if (level && level in totals) {
      totals[level as keyof typeof totals] += 1;
    }
  }

  return [
    { name: "Baixa", value: totals.baixa, color: "var(--criticality-low)" },
    { name: "Média", value: totals.media, color: "var(--criticality-medium)" },
    { name: "Alta", value: totals.alta, color: "var(--criticality-high)" },
    { name: "Crítica", value: totals.critica, color: "var(--criticality-critical)" },
  ];
}

export default async function OfficeDashboardPage() {
  const profile = await requireRole(["leader", "user"]);
  const dashboardRole: DashboardHomeData["role"] =
    profile.role === "leader" ? "leader" : "user";

  if (!profile.office_id) {
    return (
      <PageLayout
        title="Dashboard"
        description="Não foi possível identificar o escritório do usuário."
      >
        <p className="text-destructive">Erro: escritório não encontrado.</p>
      </PageLayout>
    );
  }

  const allowedModuleIds = await getAllowedModuleIds(profile);
  const supabase = await createClient();

  const priorityQuery = supabase
    .from("demands")
    .select(`
      id,
      title,
      status,
      priority,
      created_at,
      updated_at,
      assigned_profile:assigned_to (full_name)
    `)
    .eq("office_id", profile.office_id)
    .in("status", ["active", "paused"])
    .order("updated_at", { ascending: false })
    .limit(8);

  const scopedPriorityQuery =
    profile.role === "user"
      ? priorityQuery.eq("assigned_to", profile.id)
      : priorityQuery;

  const [
    officeRes,
    officeActiveRes,
    officeUrgentRes,
    myActiveRes,
    myUrgentRes,
    myCompletedRes,
    myActivityRes,
    processModelsRes,
    improvementsRes,
    analysisCountRes,
    implementationRes,
    aiUsageRes,
    auditRes,
    criticalityRes,
    notificationsRes,
    notificationReadsRes,
    priorityRes,
    aiRecentRes,
  ] = await Promise.all([
    supabase.from("offices").select("name").eq("id", profile.office_id).maybeSingle(),
    supabase
      .from("demands")
      .select("*", { count: "exact", head: true })
      .eq("office_id", profile.office_id)
      .in("status", ["active", "paused"]),
    supabase
      .from("demands")
      .select("*", { count: "exact", head: true })
      .eq("office_id", profile.office_id)
      .eq("priority", "urgent")
      .in("status", ["active", "paused"]),
    supabase
      .from("demands")
      .select("*", { count: "exact", head: true })
      .eq("office_id", profile.office_id)
      .eq("assigned_to", profile.id)
      .in("status", ["active", "paused"]),
    supabase
      .from("demands")
      .select("*", { count: "exact", head: true })
      .eq("office_id", profile.office_id)
      .eq("assigned_to", profile.id)
      .eq("priority", "urgent")
      .in("status", ["active", "paused"]),
    supabase
      .from("demands")
      .select("*", { count: "exact", head: true })
      .eq("office_id", profile.office_id)
      .eq("assigned_to", profile.id)
      .eq("status", "completed"),
    supabase
      .from("audit_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id),
    supabase
      .from("process_models")
      .select("*", { count: "exact", head: true })
      .eq("office_id", profile.office_id),
    supabase
      .from("improvements")
      .select("*", { count: "exact", head: true })
      .eq("office_id", profile.office_id),
    supabase
      .from("analysis_results")
      .select("*", { count: "exact", head: true })
      .eq("office_id", profile.office_id),
    supabase
      .from("implementation_plans")
      .select("*", { count: "exact", head: true })
      .eq("office_id", profile.office_id)
      .eq("status", "completed"),
    supabase
      .from("ai_interactions")
      .select("*", { count: "exact", head: true })
      .eq("office_id", profile.office_id),
    supabase
      .from("audit_log")
      .select("id, action, resource_type, resource_id, details, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("analysis_results")
      .select("criticality_level")
      .eq("office_id", profile.office_id),
    supabase
      .from("notifications")
      .select("id, title, message, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("notification_reads")
      .select("notification_id")
      .eq("profile_id", profile.id),
    scopedPriorityQuery,
    supabase
      .from("ai_interactions")
      .select("id, phase, provider, output_data, created_at")
      .eq("office_id", profile.office_id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const officeName = officeRes.data?.name ?? "seu escritório";
  const officeActiveCount = officeActiveRes.count ?? 0;
  const officeUrgentCount = officeUrgentRes.count ?? 0;
  const myActiveCount = myActiveRes.count ?? 0;
  const myUrgentCount = myUrgentRes.count ?? 0;
  const myCompletedCount = myCompletedRes.count ?? 0;
  const myActivityCount = myActivityRes.count ?? 0;
  const processModelsCount = processModelsRes.count ?? 0;
  const improvementsCount = improvementsRes.count ?? 0;
  const analysisCount = analysisCountRes.count ?? 0;
  const implementationCount = implementationRes.count ?? 0;
  const aiUsageCount = aiUsageRes.count ?? 0;

  const readIds = new Set(
    notificationReadsRes.error
      ? []
      : (notificationReadsRes.data ?? []).map((row) => row.notification_id)
  );
  const unreadNotifications = (notificationsRes.data ?? []).filter(
    (notification) => !readIds.has(notification.id)
  ) as NotificationRow[];

  const quickActions: DashboardQuickAction[] = SHORTCUT_CATALOG.filter((shortcut) => {
    if (!shortcut.roles.includes(dashboardRole)) return false;
    if (!shortcut.moduleId) return true;
    return allowedModuleIds.has(shortcut.moduleId);
  }).slice(0, 6);

  const priorityItems = ((priorityRes.data ?? []) as DemandRow[])
    .sort((a, b) => {
      const priorityDiff =
        (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    })
    .slice(0, 5)
    .map((demand) => ({
      id: demand.id,
      title: demand.title,
      status: getStatusLabel(demand.status),
      priority: getPriorityLabel(demand.priority),
      href: `/escritorio/demandas/${demand.id}`,
      createdAt: demand.created_at,
      updatedAt: demand.updated_at,
      owner: getAssignedName(demand.assigned_profile),
    }));

  // Não repassar `details` bruto do audit: JSONB pode falhar na serialização RSC em alguns casos.
  const activityItems = (auditRes.data ?? []).map((row) => ({
    id: row.id,
    action: row.action ?? "",
    resourceType: row.resource_type ?? "",
    resourceId: row.resource_id,
    details: null as Record<string, unknown> | null,
    createdAt:
      typeof row.created_at === "string" && row.created_at
        ? row.created_at
        : new Date().toISOString(),
    userId: row.user_id,
  }));

  const alerts = [
    ...(profile.role === "leader" && officeUrgentCount > 0
      ? [
          {
            id: "urgent-office-demands",
            title: `${officeUrgentCount} demanda(s) urgente(s) em andamento`,
            description: "Priorize o acompanhamento das demandas críticas do escritório.",
            href: "/escritorio/demandas",
            tone: "warning" as const,
          },
        ]
      : []),
    ...(profile.role === "user" && myUrgentCount > 0
      ? [
          {
            id: "urgent-my-demands",
            title: `${myUrgentCount} demanda(s) urgente(s) atribuída(s) a você`,
            description: "Há prioridades imediatas aguardando ação no seu fluxo de trabalho.",
            href: "/escritorio/demandas",
            tone: "warning" as const,
          },
        ]
      : []),
    ...unreadNotifications.slice(0, 3).map((notification) => ({
      id: notification.id,
      title: notification.title,
      description: summarizeText(notification.message, "Nova notificação disponível."),
      href: "/escritorio/notificacoes",
      tone: "default" as const,
    })),
  ].slice(0, 4);

  const aiInsights = ((aiRecentRes.data ?? []) as AIInteractionRow[]).map((item) => ({
    id: item.id,
    title: PHASE_LABELS[item.phase] ?? item.phase,
    summary: summarizeText(
      item.output_data,
      "A interação foi registrada, mas não há texto resumível disponível."
    ),
    provider: item.provider,
    createdAt: item.created_at,
  }));

  const metrics: DashboardMetricItem[] =
    dashboardRole === "leader"
      ? [
          {
            id: "demandas-ativas",
            label: "Demandas Ativas",
            value: officeActiveCount,
            icon: "ClipboardList",
          },
          {
            id: "prioridades-urgentes",
            label: "Prioridades Urgentes",
            value: officeUrgentCount,
            icon: "AlertTriangle",
          },
          {
            id: "processos-analisados",
            label: "Processos Analisados",
            value: analysisCount,
            icon: "FileSearch",
          },
          {
            id: "processos-implantados",
            label: "Implantações Concluídas",
            value: implementationCount,
            icon: "CheckCircle2",
          },
          {
            id: "alertas-nao-lidos",
            label: "Alertas Não Lidos",
            value: unreadNotifications.length,
            icon: "Bell",
          },
          {
            id: "uso-ia",
            label: "Uso de IA",
            value: aiUsageCount,
            icon: "Bot",
          },
        ]
      : [
          {
            id: "minhas-demandas",
            label: "Minhas Demandas",
            value: myActiveCount,
            icon: "Briefcase",
          },
          {
            id: "prioridades-urgentes",
            label: "Urgentes para Mim",
            value: myUrgentCount,
            icon: "AlertTriangle",
          },
          {
            id: "demandas-concluidas",
            label: "Demandas Concluídas",
            value: myCompletedCount,
            icon: "CheckCircle2",
          },
          {
            id: "alertas-nao-lidos",
            label: "Alertas Não Lidos",
            value: unreadNotifications.length,
            icon: "Bell",
          },
          {
            id: "minha-atividade",
            label: "Minha Atividade",
            value: myActivityCount,
            icon: "Activity",
          },
          {
            id: "uso-ia",
            label: "Uso de IA do Escritório",
            value: aiUsageCount,
            icon: "Bot",
          },
        ];

  const data: DashboardHomeData = {
    role: dashboardRole,
    officeName,
    userName: getFirstName(profile.full_name),
    headerTitle:
      dashboardRole === "leader"
        ? "Dashboard Inteligente"
        : "Minha Home Operacional",
    headerDescription:
      dashboardRole === "leader"
        ? `Panorama do ${officeName} com prioridades, indicadores BPM, atividade recente e uso de IA.`
        : `Acompanhe suas prioridades, pendências e o andamento operacional do ${officeName}.`,
    statusMessage:
      dashboardRole === "leader"
        ? `${officeActiveCount} demanda(s) ativa(s), ${unreadNotifications.length} alerta(s) não lido(s) e ${aiUsageCount} interação(ões) com IA registradas.`
        : `${myActiveCount} demanda(s) sob sua responsabilidade, ${unreadNotifications.length} alerta(s) não lido(s) e ${myUrgentCount} prioridade(s) urgente(s).`,
    metrics,
    quickActions,
    prioritiesTitle:
      dashboardRole === "leader" ? "Fila de prioridades do escritório" : "Minhas prioridades",
    prioritiesDescription:
      dashboardRole === "leader"
        ? "Demandas mais sensíveis do momento, ordenadas por urgência e atualização."
        : "Demandas atribuídas a você que exigem acompanhamento mais próximo.",
    priorityItems,
    alerts,
    bpmSummary: [
      {
        id: "mapeamento",
        label: "Mapeamento",
        value: processModelsCount,
        description: "Modelos de processo registrados.",
      },
      {
        id: "analise",
        label: "Análise",
        value: analysisCount,
        description: "Diagnósticos e criticidade avaliados.",
      },
      {
        id: "melhorias",
        label: "Melhorias",
        value: improvementsCount,
        description: "Propostas e planos de otimização.",
      },
      {
        id: "implantacao",
        label: "Implantação",
        value: implementationCount,
        description: "Planos concluídos e entregues.",
      },
    ],
    criticalityData: buildCriticalityData(criticalityRes.data ?? []),
    activityItems,
    aiInsights,
  };

  return <DashboardClientWrapper data={data} />;
}
