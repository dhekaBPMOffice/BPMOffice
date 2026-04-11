"use client";

import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ActivityFeed, type ActivityItem } from "@/components/dashboard/activity-feed";
import { CriticalityChart } from "@/components/dashboard/criticality-chart";
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  Bot,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  PlusCircle,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { IconChip } from "@/components/ui/icon-chip";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ICON_MAP = {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  Bot,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  PlusCircle,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} as const;

export type DashboardIconName = keyof typeof ICON_MAP;

export interface DashboardMetricItem {
  id: string;
  label: string;
  value: number | string;
  icon: DashboardIconName;
}

export interface DashboardQuickAction {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: DashboardIconName;
}

export interface DashboardPriorityItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  href: string;
  createdAt: string;
  updatedAt: string;
  owner: string | null;
}

export interface DashboardAlertItem {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "default" | "warning";
}

export interface DashboardBpmSummaryItem {
  id: string;
  label: string;
  value: number;
  description: string;
}

export interface DashboardCriticalityDatum {
  name: string;
  value: number;
  color: string;
}

export interface DashboardAIInsight {
  id: string;
  title: string;
  summary: string;
  provider: string;
  createdAt: string;
}

export interface DashboardHomeData {
  role: "leader" | "user";
  officeName: string;
  userName: string;
  headerTitle: string;
  headerDescription: string;
  statusMessage: string;
  metrics: DashboardMetricItem[];
  quickActions: DashboardQuickAction[];
  prioritiesTitle: string;
  prioritiesDescription: string;
  priorityItems: DashboardPriorityItem[];
  alerts: DashboardAlertItem[];
  bpmSummary: DashboardBpmSummaryItem[];
  criticalityData: DashboardCriticalityDatum[];
  activityItems: ActivityItem[];
  aiInsights: DashboardAIInsight[];
}

interface DashboardContentProps {
  data: DashboardHomeData;
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Agora mesmo";
  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getPriorityVariant(priority: string) {
  if (priority === "Urgente") return "destructive";
  if (priority === "Alta") return "warning";
  return "outline";
}

function getAlertToneClass(tone: DashboardAlertItem["tone"]) {
  return tone === "warning"
    ? "border-[var(--identity-status-warning)]/30 bg-[var(--identity-status-warning)]/8"
    : "border-[var(--identity-primary)]/20 bg-[var(--identity-primary)]/5";
}

export function DashboardContent({ data }: DashboardContentProps) {
  const headerAction = (
    <Link
      href="/escritorio/notificacoes"
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
    >
      <Bell className="h-4 w-4" />
      Ver notificações
    </Link>
  );

  return (
    <PageLayout
      title={data.headerTitle}
      description={data.headerDescription}
      actions={headerAction}
    >
      <Card className="border-dashed">
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Olá, {data.userName}</p>
            <p className="text-base font-semibold text-foreground">
              Central inteligente do {data.officeName}
            </p>
          </div>
          <Badge variant="secondary" className="w-fit">
            {data.statusMessage}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Atalhos rápidos</CardTitle>
          <CardDescription>
            Ações e módulos mais úteis para o seu perfil atual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.quickActions.length === 0 ? (
            <EmptyState
              icon={LayoutDashboard}
              title="Nenhum atalho disponível"
              description="Os atalhos aparecerão aqui conforme os módulos liberados para o seu perfil."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.quickActions.map((action) => {
                const Icon = ICON_MAP[action.icon];
                return (
                  <Link
                    key={action.id}
                    href={action.href}
                    className="rounded-xl border border-border/60 bg-card p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--identity-primary)]/30 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <IconChip variant="teal" size="md" className="shrink-0">
                        <Icon className="h-4 w-4 text-white" />
                      </IconChip>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{action.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        style={{ gap: "var(--spacing-block)" }}
      >
        {data.metrics.map((metric, index) => {
          const Icon = ICON_MAP[metric.icon];
          return (
          <MetricCard
            key={metric.id}
            label={metric.label}
            value={metric.value}
            icon={Icon}
            colorIndex={index}
          />
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-3" style={{ gap: "var(--spacing-block)" }}>
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{data.prioritiesTitle}</CardTitle>
            <CardDescription>{data.prioritiesDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.priorityItems.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Nenhuma prioridade no momento"
                description="Quando houver demandas ativas e atribuídas, elas aparecerão aqui."
              />
            ) : (
              <div className="space-y-3">
                {data.priorityItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 transition-colors hover:border-[var(--identity-primary)]/30 hover:bg-accent/20 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant={getPriorityVariant(item.priority)}>{item.priority}</Badge>
                        <Badge variant="outline">{item.status}</Badge>
                        {item.owner && data.role === "leader" && (
                          <Badge variant="secondary">{item.owner}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground md:text-right">
                      <p>Atualizado {formatRelativeDate(item.updatedAt)}</p>
                      <p>Criado {formatRelativeDate(item.createdAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Alertas e pendências
            </CardTitle>
            <CardDescription>
              Itens que merecem atenção operacional imediata.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.alerts.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="Tudo em dia"
                description="Não há alertas ou pendências relevantes para destacar agora."
              />
            ) : (
              <div className="space-y-3">
                {data.alerts.map((alert) => (
                  <Link
                    key={alert.id}
                    href={alert.href}
                    className={cn(
                      "block rounded-xl border p-4 transition-colors hover:bg-accent/20",
                      getAlertToneClass(alert.tone)
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {alert.description}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3" style={{ gap: "var(--spacing-block)" }}>
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Indicadores de evolução do ciclo BPM
            </CardTitle>
            <CardDescription>
              Acompanhe o avanço das etapas principais e a distribuição da criticidade.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {data.bpmSummary.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border/60 bg-muted/20 p-4"
                >
                  <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{item.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
            <CriticalityChart data={data.criticalityData} />
          </CardContent>
        </Card>

        <div>
          <ActivityFeed items={data.activityItems} maxItems={10} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <IconChip variant="teal" size="sm">
              <Sparkles className="h-4 w-4 text-white" />
            </IconChip>
            Insights e recomendações com IA
          </CardTitle>
          <CardDescription>
            Mostrados apenas quando o sistema já possui interações úteis registradas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.aiInsights.length === 0 ? (
            <EmptyState
              icon={Bot}
              title="Ainda não há insights com IA disponíveis"
              description="Assim que o escritório registrar interações relevantes com IA, os destaques aparecerão aqui."
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-3">
              {data.aiInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="rounded-xl border border-border/60 bg-card p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                    <Badge variant="outline">{insight.provider}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {insight.summary}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Registrado {formatRelativeDate(insight.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
