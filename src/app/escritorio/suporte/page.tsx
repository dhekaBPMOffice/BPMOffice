"use client";

import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { createTicket, getTickets } from "./actions";
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
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import type { SupportTicket } from "@/types/database";
import { LayoutGrid, LifeBuoy, List } from "lucide-react";

const PRIORITIES = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  closed: "Fechado",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  open: "warning",
  in_progress: "default",
  resolved: "success",
  closed: "secondary",
};

export default function SuportePage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aba, setAba] = useState<"lista" | "arquivados">("lista");
  const [visualizacao, setVisualizacao] = useState<"lista" | "card">("lista");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");

  async function loadTickets() {
    const result = await getTickets();
    setTickets(result.data);
    setLoading(false);
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await createTicket(title, description, priority);

    setSubmitting(false);

    if (result.success) {
      setTitle("");
      setDescription("");
      setPriority("medium");
      loadTickets();
    } else {
      setError(result.error ?? "Erro ao criar chamado.");
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

  const chamadosAtivos = tickets.filter((ticket) => ticket.status !== "resolved" && ticket.status !== "closed");
  const chamadosArquivados = tickets.filter((ticket) => ticket.status === "resolved" || ticket.status === "closed");
  const chamadosVisiveis = aba === "arquivados" ? chamadosArquivados : chamadosAtivos;

  return (
    <PageLayout
      title="Suporte"
      description="Abra chamados e acompanhe o status dos seus tickets."
      iconName="LifeBuoy"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Novo chamado</CardTitle>
            <CardDescription>
              Descreva o problema ou solicitação para nossa equipe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Resumo do problema"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes do problema ou solicitação..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Enviando..." : "Criar chamado"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meus chamados</CardTitle>
            <CardDescription>
              Histórico de tickets do escritório.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex rounded-md bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setAba("lista")}
                  className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                    aba === "lista" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Lista
                </button>
                <button
                  type="button"
                  onClick={() => setAba("arquivados")}
                  className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                    aba === "arquivados" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Arquivados
                </button>
              </div>
              <div className="inline-flex rounded-md border border-input bg-background p-1">
                <button
                  type="button"
                  onClick={() => setVisualizacao("lista")}
                  className={`rounded-sm p-2 transition-colors ${
                    visualizacao === "lista" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Visualização em lista"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setVisualizacao("card")}
                  className={`rounded-sm p-2 transition-colors ${
                    visualizacao === "card" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Visualização em cards"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>

            {loading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : chamadosVisiveis.length === 0 ? (
              <p className="text-muted-foreground">
                {aba === "arquivados" ? "Nenhum chamado arquivado." : "Nenhum chamado ativo."}
              </p>
            ) : (
              visualizacao === "lista" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chamadosVisiveis.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[t.status] ?? "secondary"}>
                            {STATUS_LABELS[t.status] ?? t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">
                          {PRIORITIES.find((p) => p.value === t.priority)?.label ?? t.priority ?? "Média"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(t.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {chamadosVisiveis.map((t) => (
                    <Card key={t.id} className="border border-border/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{t.title}</CardTitle>
                        <CardDescription>
                          {PRIORITIES.find((p) => p.value === t.priority)?.label ?? t.priority ?? "Média"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <Badge variant={STATUS_VARIANTS[t.status] ?? "secondary"}>
                          {STATUS_LABELS[t.status] ?? t.status}
                        </Badge>
                        <p className="text-muted-foreground">
                          Data: <span className="text-foreground">{formatDate(t.created_at)}</span>
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
