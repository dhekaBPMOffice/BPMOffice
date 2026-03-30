"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  FileText,
  Target,
  ClipboardList,
  BookOpen,
  GraduationCap,
  LifeBuoy,
  CreditCard,
  Palette,
  Bot,
  Bell,
  ChevronLeft,
  ChevronRight,
  DatabaseBackup,
  HelpCircle,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import { type UserRole } from "@/types/database";
import { IconChip } from "@/components/ui/icon-chip";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const adminNavGroups: NavGroup[] = [
  {
    label: "Plataforma",
    items: [
      { label: "Painel Geral", href: "/admin", icon: LayoutDashboard },
      { label: "Escritórios", href: "/admin/escritorios", icon: Building2 },
      { label: "Planos", href: "/admin/planos", icon: CreditCard },
      { label: "Administradores Master", href: "/admin/administradores", icon: ShieldCheck },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { label: "Processos Base", href: "/admin/processos", icon: ClipboardList },
      { label: "Objetivos Base", href: "/admin/objetivos-escritorio", icon: Target },
      { label: "Serviços Base", href: "/admin/servicos", icon: FileText },
    ],
  },
  {
    label: "Configurações",
    items: [
      { label: "Identidade Visual", href: "/admin/branding", icon: Palette },
      { label: "Formulários", href: "/admin/formularios", icon: BookOpen },
      { label: "Configuração IA", href: "/admin/ia", icon: Bot },
      { label: "Parâmetros da Plataforma", href: "/admin/configuracoes", icon: Settings },
    ],
  },
  {
    label: "Operação e Suporte",
    items: [
      { label: "Notificações", href: "/admin/notificacoes", icon: Bell },
      { label: "Chamados", href: "/admin/chamados", icon: LifeBuoy },
      { label: "Backup", href: "/admin/backup", icon: DatabaseBackup },
      { label: "Manual do Usuário", href: "/admin/manual", icon: HelpCircle },
    ],
  },
];

const leaderNavGroups: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/escritorio/dashboard", icon: LayoutDashboard },
      { label: "Estratégia", href: "/escritorio/estrategia", icon: Target },
      { label: "Processos do Escritório", href: "/escritorio/processos", icon: FileText },
      { label: "Visão geral — processos", href: "/escritorio/processos/visao-geral", icon: BarChart3 },
      { label: "Demandas", href: "/escritorio/demandas", icon: ClipboardList },
    ],
  },
  {
    items: [
      { label: "Conhecimento", href: "/escritorio/conhecimento", icon: BookOpen },
      { label: "Capacitação", href: "/escritorio/capacitacao", icon: GraduationCap },
      { label: "Usuários", href: "/escritorio/usuarios", icon: Users },
    ],
  },
  {
    items: [
      { label: "Identidade Visual", href: "/escritorio/branding", icon: Palette },
      { label: "Backup", href: "/escritorio/backup", icon: DatabaseBackup },
      { label: "Manual", href: "/escritorio/manual", icon: HelpCircle },
      { label: "Configurações", href: "/escritorio/configuracoes", icon: Settings },
      { label: "Suporte", href: "/escritorio/suporte", icon: LifeBuoy },
    ],
  },
];

const userNavGroups: NavGroup[] = [
  {
    items: [
      { label: "Área de Trabalho", href: "/escritorio/trabalho", icon: LayoutDashboard },
      { label: "Demandas", href: "/escritorio/demandas", icon: ClipboardList },
      { label: "Conhecimento", href: "/escritorio/conhecimento", icon: BookOpen },
      { label: "Capacitação", href: "/escritorio/capacitacao", icon: GraduationCap },
    ],
  },
  {
    items: [
      { label: "Manual", href: "/escritorio/manual", icon: HelpCircle },
    ],
  },
];

export function Sidebar({
  role,
  officeName,
  logoUrl,
}: {
  role: UserRole;
  officeName?: string;
  logoUrl?: string | null;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navGroups =
    role === "admin_master"
      ? adminNavGroups
      : role === "leader"
        ? leaderNavGroups
        : userNavGroups;

  return (
    <aside
      className={cn(
        "flex flex-col bg-surface transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
      style={{ boxShadow: "var(--shadow-sidebar)" }}
    >
      {/* Barra de acento dheka */}
      <div className="accent-line shrink-0" />

      <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid var(--color-divider)" }}>
        {!collapsed && (
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2.5">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-8 w-auto max-h-8 object-contain object-left"
                />
              ) : (
                <>
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[var(--dheka-teal)] to-[var(--dheka-cyan)] flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 100 100" className="h-5 w-5">
                      <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="none" stroke="white" strokeWidth="4"/>
                      <polygon points="50,25 75,37.5 75,62.5 50,75 25,62.5 25,37.5" fill="white" fillOpacity="0.35" stroke="white" strokeWidth="2"/>
                    </svg>
                  </div>
                  <span className="text-sm font-bold bg-gradient-to-r from-[var(--dheka-teal)] to-[var(--dheka-cyan)] bg-clip-text text-transparent">
                    dheka
                  </span>
                </>
              )}
            </div>
            {officeName && (
              <span className="text-xs text-muted-foreground truncate max-w-[180px] pl-0.5">
                {officeName}
              </span>
            )}
          </div>
        )}
        {collapsed && (
          <div className="mx-auto h-8 w-8 rounded-lg flex items-center justify-center overflow-hidden bg-background">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={role === "admin_master" ? "Logo da dheka" : "Logo do escritório"}
                className="h-7 w-7 object-contain"
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[var(--dheka-teal)] to-[var(--dheka-cyan)] flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="h-5 w-5">
                  <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="none" stroke="white" strokeWidth="4"/>
                  <polygon points="50,25 75,37.5 75,62.5 50,75 25,62.5 25,37.5" fill="white" fillOpacity="0.35" stroke="white" strokeWidth="2"/>
                </svg>
              </div>
            )}
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg p-1.5 hover:bg-accent/50 text-muted-foreground transition-colors"
            aria-label="Recolher menu"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center p-2" style={{ borderBottom: "1px solid var(--color-divider)" }}>
          <button
            onClick={() => setCollapsed(false)}
            className="rounded-lg p-1.5 hover:bg-accent/50 text-muted-foreground transition-colors"
            aria-label="Expandir menu"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {!mounted ? (
          <div className="space-y-0.5" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg py-2",
                  collapsed ? "mx-auto w-8" : "px-3"
                )}
              >
                <div
                  className={cn(
                    "rounded bg-muted/40 animate-pulse",
                    collapsed ? "h-5 w-5" : "h-5 w-20"
                  )}
                />
              </div>
            ))}
          </div>
        ) : (
          navGroups.map((group, groupIdx) => (
            <div key={groupIdx}>
              {groupIdx > 0 && (
                <div className="divider mx-2 mt-3 mb-5" />
              )}
              {group.label && !collapsed && (
                <p className="px-3 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/admin" || item.href === "/escritorio/dashboard" || item.href === "/escritorio/trabalho"
                      ? pathname === item.href
                      : pathname.startsWith(item.href);

                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-all duration-150",
                        collapsed ? "justify-center px-2" : "px-3",
                        isActive
                          ? "border-l-[3px] border-l-[var(--identity-primary)] bg-gradient-to-r from-[var(--identity-primary)]/12 to-[var(--identity-primary)]/4 text-[var(--identity-primary)] font-semibold"
                          : "border-l-[3px] border-l-transparent text-muted-foreground/80 hover:bg-accent/50 hover:text-foreground"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      {isActive ? (
                        <IconChip icon={Icon} variant="teal" size="sm" />
                      ) : (
                        <Icon
                          className={cn(
                            "h-5 w-5 shrink-0 transition-all",
                            "opacity-70 group-hover:opacity-100"
                          )}
                        />
                      )}
                      {!collapsed && <span>{item.label}</span>}
                      {isActive && !collapsed && (
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--identity-primary)]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </nav>
    </aside>
  );
}
