"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { PageLayout } from "@/components/layout/page-layout";
import { Bell } from "lucide-react";
import { sendNotification } from "./actions";

interface Notification {
  id: string;
  title: string;
  message: string;
  target_type: string;
  channel: string;
  created_at: string;
  offices: { name: string } | null;
}

export default function NotificacoesPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] = useState<"all" | "office">("all");
  const [targetOfficeId, setTargetOfficeId] = useState("");
  const [channel, setChannel] = useState<"platform" | "email" | "both">("platform");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [offices, setOffices] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [notifRes, officesRes] = await Promise.all([
        supabase
          .from("notifications")
          .select(`
            id,
            title,
            message,
            target_type,
            channel,
            created_at,
            target_office_id,
            offices:target_office_id (name)
          `)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("offices").select("id, name").order("name"),
      ]);

      if (notifRes.data) {
        setNotifications(
          notifRes.data.map((n) => ({
            ...n,
            offices: Array.isArray(n.offices) ? n.offices[0] : n.offices,
          })) as Notification[]
        );
      }
      if (officesRes.data) {
        setOffices(officesRes.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);

    const result = await sendNotification({
      title,
      message,
      target_type: targetType,
      target_office_id: targetType === "office" ? targetOfficeId : undefined,
      channel,
    });

    if (result?.error) {
      setError(result.error);
      setSending(false);
      return;
    }

    setTitle("");
    setMessage("");
    setError(null);
    setSending(false);

    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select(`
        id,
        title,
        message,
        target_type,
        channel,
        created_at,
        offices:target_office_id (name)
      `)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setNotifications((prev) => [
        {
          ...data,
          offices: Array.isArray(data.offices) ? data.offices[0] : data.offices,
        } as Notification,
        ...prev,
      ]);
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

  const channelLabels: Record<string, string> = {
    platform: "Plataforma",
    email: "E-mail",
    both: "Ambos",
  };

  return (
    <PageLayout title="Notificações" description="Envie notificações para os escritórios e visualize o histórico." icon={Bell}>
      <Card>
        <CardHeader>
          <CardTitle>Enviar Notificação</CardTitle>
          <CardDescription>
            Envie uma notificação para todos os escritórios ou um específico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título da notificação"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Conteúdo da notificação"
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target">Destino</Label>
                <Select
                  id="target"
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as "all" | "office")}
                >
                  <option value="all">Todos os escritórios</option>
                  <option value="office">Escritório específico</option>
                </Select>
              </div>
              {targetType === "office" && (
                <div className="space-y-2">
                  <Label htmlFor="office_id">Escritório</Label>
                  <Select
                    id="office_id"
                    value={targetOfficeId}
                    onChange={(e) => setTargetOfficeId(e.target.value)}
                    required={targetType === "office"}
                  >
                    <option value="">Selecione</option>
                    {offices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="channel">Canal</Label>
                <Select
                  id="channel"
                  value={channel}
                  onChange={(e) =>
                    setChannel(e.target.value as "platform" | "email" | "both")
                  }
                >
                  <option value="platform">Plataforma</option>
                  <option value="email">E-mail</option>
                  <option value="both">Ambos</option>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={sending}>
              {sending ? "Enviando..." : "Enviar notificação"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificações enviadas</CardTitle>
          <CardDescription>
            Histórico das últimas notificações enviadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhuma notificação enviada.
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.title}</TableCell>
                    <TableCell>
                      {n.target_type === "all"
                        ? "Todos"
                        : (n.offices as { name: string } | null)?.name ?? "—"}
                    </TableCell>
                    <TableCell>{channelLabels[n.channel] ?? n.channel}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(n.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
