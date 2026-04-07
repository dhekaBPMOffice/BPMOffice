"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { PageLayout } from "@/components/layout/page-layout";
import { HardDrive, Download, Database, Settings } from "lucide-react";
import {
  getBackups,
  createManualBackup,
  getPlatformBackupConfig,
  savePlatformBackupConfig,
  type Backup,
} from "./actions";

export default function AdminBackupPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [configEnabled, setConfigEnabled] = useState(false);
  const [configFrequency, setConfigFrequency] = useState("daily");
  const [configSaving, setConfigSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [backupsRes, configRes] = await Promise.all([
      getBackups(),
      getPlatformBackupConfig(),
    ]);
    setLoading(false);
    if (backupsRes.error) setError(backupsRes.error);
    else setBackups(backupsRes.data ?? []);
    if (configRes.data) {
      setConfigEnabled(configRes.data.enabled);
      setConfigFrequency(configRes.data.frequency ?? "daily");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreateBackup() {
    setError(null);
    setCreating(true);
    const result = await createManualBackup();
    setCreating(false);
    if (result.error) setError(result.error);
    else load();
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConfigSaving(true);
    const result = await savePlatformBackupConfig({
      enabled: configEnabled,
      frequency: configFrequency,
    });
    setConfigSaving(false);
    if (result.error) setError(result.error);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <PageLayout title="Backup da Plataforma" description="Crie backups manuais e configure o agendamento automático." iconName="HardDrive">

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Manual Backup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Backup Manual
            </CardTitle>
            <CardDescription>
              Crie um backup completo da plataforma agora.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreateBackup} disabled={creating}>
              {creating ? "Criando..." : "Criar backup agora"}
            </Button>
          </CardContent>
        </Card>

        {/* Auto Backup Config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Backup Automático
            </CardTitle>
            <CardDescription>
              Configure a frequência do backup automático.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="configEnabled"
                  checked={configEnabled}
                  onChange={(e) => setConfigEnabled(e.target.checked)}
                  className="rounded border-input"
                />
                <Label htmlFor="configEnabled">Habilitar backup automático</Label>
              </div>
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select
                  value={configFrequency}
                  onChange={(e) => setConfigFrequency(e.target.value)}
                >
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                </Select>
              </div>
              <Button type="submit" disabled={configSaving}>
                {configSaving ? "Salvando..." : "Salvar configuração"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Backups List */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Backups</CardTitle>
          <CardDescription>
            Lista de backups criados. Clique para baixar quando disponível.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-4">Carregando...</p>
          ) : backups.length === 0 ? (
            <p className="text-muted-foreground py-4">Nenhum backup criado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{formatDate(b.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {b.type === "manual" ? "Manual" : "Automático"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          b.status === "completed"
                            ? "default"
                            : b.status === "pending"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {b.status === "completed"
                          ? "Concluído"
                          : b.status === "pending"
                            ? "Pendente"
                            : b.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {b.file_url ? (
                        <a
                          href={b.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--identity-primary)] hover:underline inline-flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          Baixar
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
