"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageLayout } from "@/components/layout/page-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  target_type: string;
  created_at: string;
}

export default function EscritorioNotificacoesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (!profile?.id) {
        setLoading(false);
        return;
      }
      setProfileId(profile.id);

      const [notifRes, readsRes] = await Promise.all([
        supabase
          .from("notifications")
          .select("id, title, message, target_type, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("notification_reads")
          .select("notification_id")
          .eq("profile_id", profile.id),
      ]);

      setNotifications(notifRes.data ?? []);
      setReadIds(
        readsRes.error
          ? new Set()
          : new Set((readsRes.data ?? []).map((r) => r.notification_id))
      );
      setLoading(false);
    }
    load();
  }, []);

  async function markAsRead(notificationIds: string[]) {
    if (!profileId) return;
    const supabase = createClient();
    const rows = notificationIds.map((notification_id) => ({
      notification_id,
      profile_id: profileId,
    }));
    const { error } = await supabase.from("notification_reads").upsert(rows, {
      onConflict: "notification_id,profile_id",
    });
    if (!error) {
      setReadIds((prev) => {
        const next = new Set(prev);
        notificationIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <PageLayout
      title="Notificações"
      description="Notificações enviadas para o seu escritório."
      iconName="Bell"
    >
      <Card>
        <CardHeader>
          <CardTitle>Notificações recebidas</CardTitle>
          <CardDescription>
            Histórico das notificações enviadas pela plataforma ou administração.
            Marque como lida para organizar sua lista.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground rounded-lg border border-dashed border-border/60">
              Nenhuma notificação recebida.
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => {
                const isRead = readIds.has(n.id);
                return (
                  <div
                    key={n.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      isRead
                        ? "border-border/40 bg-muted/20 hover:bg-muted/30"
                        : "border-[var(--identity-primary)]/30 bg-[var(--identity-primary)]/5 hover:bg-[var(--identity-primary)]/10"
                    }`}
                  >
                    <div className="flex gap-4 items-start">
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold leading-tight ${
                            isRead ? "text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {n.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                          {n.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDate(n.created_at)}
                        </p>
                      </div>
                      {!isRead && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1.5 text-[var(--identity-primary)] border-[var(--identity-primary)]/40 hover:bg-[var(--identity-primary)]/10"
                          onClick={() => markAsRead([n.id])}
                        >
                          <Check className="h-4 w-4" />
                          Marcar como lida
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
