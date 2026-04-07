"use client";

import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import {
  getTrainingPlans,
  createTrainingPlan,
  updateTrainingPlan,
  getUserTrainingRecords,
  createTrainingRecord,
  updateTrainingRecord,
  type TrainingPlan,
  type TrainingRecord,
} from "./actions";

type RecordWithPlan = TrainingRecord & {
  plan?: TrainingPlan;
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Concluído" },
];

export default function CapacitacaoPage() {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [records, setRecords] = useState<RecordWithPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planRoleTarget, setPlanRoleTarget] = useState("");
  const [planTitle, setPlanTitle] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [planContent, setPlanContent] = useState("");

  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [recordUserId, setRecordUserId] = useState("");
  const [recordPlanId, setRecordPlanId] = useState("");
  const [recordNotes, setRecordNotes] = useState("");
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [recordStatus, setRecordStatus] = useState("pending");

  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);

  async function loadPlans() {
    const res = await getTrainingPlans();
    if (res.error) setError(res.error);
    else setPlans(res.data ?? []);
  }

  async function loadRecords() {
    const res = await getUserTrainingRecords();
    if (res.error) setError(res.error);
    else setRecords(res.data ?? []);
  }

  async function loadUsers() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("office_id")
      .eq("auth_user_id", user.id)
      .single();
    if (!profile?.office_id) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("office_id", profile.office_id)
      .eq("is_active", true)
      .order("full_name");
    setUsers((data ?? []) as { id: string; full_name: string }[]);
  }

  async function load() {
    setLoading(true);
    await Promise.all([loadPlans(), loadRecords(), loadUsers()]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreatePlan() {
    setEditingPlanId(null);
    setPlanRoleTarget("");
    setPlanTitle("");
    setPlanDescription("");
    setPlanContent("");
    setShowPlanDialog(true);
  }

  function openEditPlan(plan: TrainingPlan) {
    setEditingPlanId(plan.id);
    setPlanRoleTarget(plan.role_target);
    setPlanTitle(plan.title);
    setPlanDescription(plan.description ?? "");
    setPlanContent(plan.content ?? "");
    setShowPlanDialog(true);
  }

  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (editingPlanId) {
      const result = await updateTrainingPlan(editingPlanId, {
        role_target: planRoleTarget,
        title: planTitle,
        description: planDescription || undefined,
        content: planContent || undefined,
      });
      if (result.error) setError(result.error);
      else {
        setShowPlanDialog(false);
        loadPlans();
      }
    } else {
      const result = await createTrainingPlan({
        role_target: planRoleTarget,
        title: planTitle,
        description: planDescription || undefined,
        content: planContent || undefined,
      });
      if (result.error) setError(result.error);
      else {
        setShowPlanDialog(false);
        loadPlans();
      }
    }
  }

  function openCreateRecord() {
    setEditingRecordId(null);
    setRecordUserId(users[0]?.id ?? "");
    setRecordPlanId(plans[0]?.id ?? "");
    setRecordNotes("");
    setRecordStatus("pending");
    setShowRecordDialog(true);
  }

  function openEditRecord(record: RecordWithPlan) {
    setEditingRecordId(record.id);
    setRecordUserId(record.user_id);
    setRecordPlanId(record.plan_id);
    setRecordNotes(record.notes ?? "");
    setRecordStatus(record.status);
    setShowRecordDialog(true);
  }

  async function handleSaveRecord(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (editingRecordId) {
      const result = await updateTrainingRecord(editingRecordId, {
        status: recordStatus as "pending" | "in_progress" | "completed",
        notes: recordNotes || null,
      });
      if (result.error) setError(result.error);
      else {
        setShowRecordDialog(false);
        loadRecords();
      }
    } else {
      const result = await createTrainingRecord({
        user_id: recordUserId,
        plan_id: recordPlanId,
        status: recordStatus as "pending" | "in_progress" | "completed",
        notes: recordNotes || undefined,
      });
      if (result.error) setError(result.error);
      else {
        setShowRecordDialog(false);
        loadRecords();
      }
    }
  }

  async function handleRecordStatusChange(recordId: string, status: string) {
    const result = await updateTrainingRecord(recordId, {
      status: status as "pending" | "in_progress" | "completed",
    });
    if (result.error) setError(result.error);
    else loadRecords();
  }

  if (loading) {
    return (
      <PageLayout title="Capacitação" description="Carregando..." iconName="GraduationCap">
        <span />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Capacitação"
      description="Planos de treinamento e registros de conclusão por usuário."
      iconName="GraduationCap"
    >
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {/* Training Plans */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Planos de Treinamento
              </CardTitle>
              <CardDescription>
                Crie e gerencie planos de capacitação por perfil.
              </CardDescription>
            </div>
            <Button onClick={openCreatePlan}>
              <Plus className="h-4 w-4" />
              Novo plano
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <p className="text-muted-foreground py-4">Nenhum plano de treinamento cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{plan.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Público-alvo: {plan.role_target}
                      {plan.description && ` • ${plan.description}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditPlan(plan)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Records */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registros de Treinamento</CardTitle>
              <CardDescription>
                Status de conclusão por usuário e plano.
              </CardDescription>
            </div>
            <Button onClick={openCreateRecord} disabled={plans.length === 0 || users.length === 0}>
              <Plus className="h-4 w-4" />
              Novo registro
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-muted-foreground py-4">Nenhum registro de treinamento.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Concluído em</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {users.find((u) => u.id === record.user_id)?.full_name ?? record.user_id}
                    </TableCell>
                    <TableCell>{record.plan?.title ?? record.plan_id}</TableCell>
                    <TableCell>
                      <Select
                        value={record.status}
                        onChange={(e) =>
                          handleRecordStatusChange(record.id, e.target.value)
                        }
                        className="w-[140px]"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.completed_at
                        ? new Date(record.completed_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditRecord(record)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPlanId ? "Editar plano" : "Novo plano de treinamento"}
            </DialogTitle>
            <DialogDescription>
              Defina o público-alvo, título e conteúdo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePlan} className="space-y-4">
            <div className="space-y-2">
              <Label>Público-alvo (perfil)</Label>
              <Input
                value={planRoleTarget}
                onChange={(e) => setPlanRoleTarget(e.target.value)}
                placeholder="Ex: Analista, Líder"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={planTitle}
                onChange={(e) => setPlanTitle(e.target.value)}
                placeholder="Título do plano"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={planDescription}
                onChange={(e) => setPlanDescription(e.target.value)}
                placeholder="Descrição breve"
              />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea
                value={planContent}
                onChange={(e) => setPlanContent(e.target.value)}
                placeholder="Conteúdo do treinamento"
                rows={5}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPlanDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Dialog */}
      <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRecordId ? "Editar registro" : "Novo registro de treinamento"}
            </DialogTitle>
            <DialogDescription>
              Vincule um usuário a um plano e defina o status.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveRecord} className="space-y-4">
            {!editingRecordId && (
              <>
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Select
                    value={recordUserId}
                    onChange={(e) => setRecordUserId(e.target.value)}
                    required
                  >
                    <option value="">Selecione...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Plano</Label>
                  <Select
                    value={recordPlanId}
                    onChange={(e) => setRecordPlanId(e.target.value)}
                    required
                  >
                    <option value="">Selecione...</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={recordStatus}
                onChange={(e) => setRecordStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={recordNotes}
                onChange={(e) => setRecordNotes(e.target.value)}
                placeholder="Observações"
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRecordDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
