/**
 * Mapa de ícones para o Manual de Uso.
 * Usa strings para permitir serialização Server -> Client.
 */

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Bot,
  Building2,
  ClipboardList,
  CreditCard,
  DatabaseBackup,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Network,
  Palette,
  Bell,
  Settings,
  Target,
  Users,
} from "lucide-react";

export const MANUAL_ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  Bot,
  Building2,
  ClipboardList,
  CreditCard,
  DatabaseBackup,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Network,
  Palette,
  Bell,
  Settings,
  Target,
  Users,
};

export type ManualIconName = keyof typeof MANUAL_ICON_MAP;
