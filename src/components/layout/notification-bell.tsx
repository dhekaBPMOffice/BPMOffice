"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Bell, Check, ArrowRight } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

interface NotificationBellProps {
  profileId: string;
}

export function NotificationBell({ profileId }: NotificationBellProps) {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const isAdmin = pathname?.startsWith("/admin");
  const verTodasHref = isAdmin ? "/admin/notificacoes" : "/escritorio/notificacoes";

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [notifRes, readsRes] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, title, message, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("notification_reads")
        .select("notification_id")
        .eq("profile_id", profileId),
    ]);

    setNotifications(notifRes.data ?? []);
    // Se notification_reads não existir (migration não aplicada), trata todas como não lidas
    setReadIds(
      readsRes.error
        ? new Set()
        : new Set((readsRes.data ?? []).map((r) => r.notification_id))
    );
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const unreadNotifications = notifications.filter((n) => !readIds.has(n.id));
  const unreadCount = unreadNotifications.length;
  const hasUnread = unreadCount > 0;

  async function markAsRead(notificationIds: string[]) {
    const supabase = createClient();
    const rows = notificationIds.map((notification_id) => ({
      notification_id,
      profile_id: profileId,
    }));
    const { error } = await supabase.from("notification_reads").upsert(rows, {
      onConflict: "notification_id,profile_id",
    });
    // Atualiza estado local mesmo se a migration não foi aplicada (fallback)
    if (!error) {
      setReadIds((prev) => {
        const next = new Set(prev);
        notificationIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  const [popoverOpen, setPopoverOpen] = useState(false);
  const isMounted = useRef(true);

  // Fecha o popover ao navegar para evitar race conditions com webpack chunks
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    setPopoverOpen(false);
  }, [pathname]);

  function handleOpenChange(open: boolean) {
    if (!isMounted.current) return;
    setPopoverOpen(open);
  }

  function handleMarkSingleAsRead(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    markAsRead([id]);
  }

  return (
    <Popover open={popoverOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Notificações"
          className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-[var(--identity-primary)] hover:bg-accent/50 transition-all duration-150"
        >
          <Bell className="h-4 w-4" />
          {hasUnread && (
            <span
              className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--dheka-magenta)]"
              aria-hidden
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="p-0 max-h-[420px] flex flex-col w-[340px]">
        <div className="border-b border-border/60 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--identity-primary)]/10">
              <Bell className="h-4 w-4 text-[var(--identity-primary)]" />
            </div>
            <h3 className="text-sm font-semibold">Notificações</h3>
            {hasUnread && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-[var(--dheka-magenta)]/20 text-[var(--dheka-magenta)]">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0 p-2 space-y-1.5">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : unreadNotifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {notifications.length === 0
                ? "Nenhuma notificação"
                : "Todas as notificações foram lidas"}
            </div>
          ) : (
            unreadNotifications.map((n) => (
              <div
                key={n.id}
                className="rounded-lg border border-[var(--identity-primary)]/30 bg-[var(--identity-primary)]/5 hover:bg-[var(--identity-primary)]/10 p-3 transition-colors"
              >
                <div className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      {new Date(n.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-[var(--identity-primary)] hover:bg-[var(--identity-primary)]/20"
                    onClick={(e) => handleMarkSingleAsRead(e, n.id)}
                    title="Marcar como lida e remover da lista"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        {(notifications.length > 0 || isAdmin) && (
          <div className="border-t border-border/60 p-2">
            <Link href={verTodasHref} prefetch={false}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-sm text-muted-foreground hover:text-foreground justify-between"
              >
                Ver todas
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
