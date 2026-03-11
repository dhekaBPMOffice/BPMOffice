"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart3,
  FileUp,
  Grid2x2,
  Loader2,
  History,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  ListChecks,
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { cn } from "@/lib/utils";
import {
  getStrategicPlans,
  getSwotItems,
  createStrategicPlan,
  deleteStrategicPlan,
  type StrategicPlan,
  type SwotItem,
} from "./actions";
import { SwotMatrix } from "./components/SwotMatrix";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-gray-100 text-gray-700" },
  active: { label: "Ativo", className: "bg-teal-100 text-teal-700" },
  archived: { label: "Arquivado", className: "bg-amber-100 text-amber-700" },
};

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function SwotPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<StrategicPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [swotItems, setSwotItems] = useState<SwotItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [referenceDate, setReferenceDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getStrategicPlans();
      if (res && typeof res === "object" && ("data" in res || "error" in res)) {
        setPlans(res.data ?? []);
        if (res.error) setLoadError(res.error);
      } else {
        setPlans([]);
        setLoadError("Resposta inesperada do servidor.");
      }
    } catch (err) {
      setPlans([]);
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar análises.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSwotItems = useCallback(async (planId: string) => {
    setItemsLoading(true);
    try {
      const res = await getSwotItems(planId);
      if (res?.data) setSwotItems(res.data);
      else setSwotItems([]);
    } catch {
      setSwotItems([]);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const planIdFromUrl = searchParams.get("planId");
  useEffect(() => {
    if (loading && plans.length === 0) return;
    const id = planIdFromUrl || plans[0]?.id || null;
    if (id && id !== selectedPlanId) {
      setSelectedPlanId(id);
      loadSwotItems(id);
    }
  }, [loading, plans, planIdFromUrl, selectedPlanId, loadSwotItems]);

  function handleSelectPlan(planId: string) {
    setSelectedPlanId(planId);
    router.replace(`/escritorio/estrategia/swot?planId=${planId}`);
    loadSwotItems(planId);
  }

  const currentPlan = plans.find((p) => p.id === selectedPlanId);
  const reloadDiagram = useCallback(async () => {
    if (selectedPlanId) await loadSwotItems(selectedPlanId);
  }, [selectedPlanId, loadSwotItems]);

  async function handleImport() {
    if (!importFile) {
      setImportError("Selecione uma imagem.");
      return;
    }
    setImportError(null);
    setImportSuccess(false);
    setImporting(true);
    try {
      const formData = new FormData();
      formData.set("file", importFile);
      const res = await fetch("/api/estrategia/swot/import-from-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? "Falha ao importar.");
        return;
      }
      setImportSuccess(true);
      setImportFile(null);
      await loadPlans();
      router.push(`/escritorio/estrategia/swot?planId=${data.planId}`);
    } catch {
      setImportError("Erro de conexão ao importar.");
    } finally {
      setImporting(false);
    }
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (!referenceDate) {
      setCreateError("Data de referência é obrigatória.");
      return;
    }
    const d = new Date(referenceDate);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const name = `Análise SWOT – ${day}/${month}/${year}`;
    setCreating(true);
    try {
      const result = await createStrategicPlan(name, year);
      if (result?.error) {
        setCreateError(result.error);
        return;
      }
      if (result?.data) {
        await loadPlans();
        router.push(`/escritorio/estrategia/swot?planId=${result.data.id}`);
      } else {
        setCreateError("Resposta inesperada do servidor.");
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Erro ao criar análise.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteId) return;
    try {
      const { error } = await deleteStrategicPlan(deleteId);
      if (!error) {
        const wasSelected = deleteId === selectedPlanId;
        setPlans((prev) => prev.filter((p) => p.id !== deleteId));
        setDeleteId(null);
        if (wasSelected) {
          setSelectedPlanId(null);
          setSwotItems([]);
        }
      }
    } catch {
      // Mantém o dialog aberto; o usuário pode tentar novamente
    }
  }

  return (
    <PageLayout
      title="Análise SWOT (F.O.F.A.)"
      description="Forças, Oportunidades, Fraquezas e Ameaças. Importe uma imagem da matriz, crie uma análise manualmente ou acompanhe o histórico das suas análises."
      icon={Grid2x2}
      backHref="/escritorio/estrategia"
    >
      <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-[var(--identity-primary)]" />
              <CardTitle>Importar matriz SWOT</CardTitle>
            </div>
            <CardDescription>
              Envie uma foto ou imagem (PNG, JPEG ou WebP) da sua matriz SWOT.
              A IA extrai os itens e preenche os quadrantes. Máx. 10 MB.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const f = e.dataTransfer.files[0];
                if (f && ACCEPTED_IMAGE_TYPES.includes(f.type)) {
                  setImportFile(f);
                  setImportError(null);
                } else setImportError("Use uma imagem PNG, JPEG ou WebP.");
              }}
              className={cn(
                "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                dragActive ? "border-[var(--identity-primary)] bg-[var(--identity-primary)]/5" : "border-border"
              )}
            >
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                className="hidden"
                id="swot-file-import"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setImportFile(f);
                    setImportError(null);
                  }
                }}
              />
              <label htmlFor="swot-file-import" className="cursor-pointer">
                <FileUp className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Solte aqui uma imagem da matriz SWOT
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  ou clique para selecionar
                </p>
              </label>
            </div>
            {importFile && (
              <p className="text-sm text-foreground">
                Arquivo: <strong>{importFile.name}</strong>
              </p>
            )}
            {importError && (
              <p className="text-sm text-destructive">{importError}</p>
            )}
            {importSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Redirecionando para o diagrama…
              </p>
            )}
            <button
              type="button"
              onClick={handleImport}
              disabled={!importFile || importing}
              className={cn(buttonVariants(), "w-full")}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando…
                </>
              ) : (
                "Importar matriz SWOT"
              )}
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[var(--identity-primary)]" />
              <CardTitle>Criar análise SWOT</CardTitle>
            </div>
            <CardDescription>
              Crie uma nova análise com uma data de referência. O nome será gerado automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <Label htmlFor="swot-reference-date">Data de referência *</Label>
                <Input
                  id="swot-reference-date"
                  type="date"
                  value={referenceDate}
                  onChange={(e) => setReferenceDate(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Nome gerado: Análise SWOT – {referenceDate ? (() => {
                    const d = new Date(referenceDate);
                    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
                  })() : "DD/MM/AAAA"}
                </p>
              </div>
              {createError && (
                <p className="text-sm text-destructive">{createError}</p>
              )}
              <button
                type="submit"
                disabled={creating || !referenceDate}
                className={cn(buttonVariants(), "w-full")}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Criando…
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Criar análise
                  </>
                )}
              </button>
            </form>
            <div className="pt-2 border-t">
              <a
                href="#analises"
                className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start gap-2")}
              >
                <History className="h-4 w-4" />
                Ver análises e histórico
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card id="analises">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-[var(--identity-primary)]" />
            <div>
              <CardTitle>Suas análises SWOT</CardTitle>
              <CardDescription>
                {loading ? "Carregando…" : currentPlan ? `Diagrama: ${currentPlan.name}` : "Selecione ou crie uma análise acima."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 mb-4">
              <p className="text-sm text-destructive">{loadError}</p>
              <button
                type="button"
                onClick={() => loadPlans()}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2")}
              >
                Tentar novamente
              </button>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !selectedPlanId || plans.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 py-12 text-center">
              <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhuma análise ainda.
              </p>
              <p className="text-sm text-muted-foreground">
                Crie uma análise ou importe uma matriz acima.
              </p>
            </div>
          ) : itemsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedPlanId && (currentPlan || swotItems.length >= 0) ? (
            <SwotMatrix
              planId={selectedPlanId}
              planName={currentPlan?.name ?? "Análise SWOT"}
              mission={currentPlan?.mission}
              vision={currentPlan?.vision}
              swotItems={swotItems}
              onReload={reloadDiagram}
            />
          ) : null}
        </CardContent>
      </Card>

      {plans.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-[var(--identity-primary)]" />
              <div>
                <CardTitle>Histórico de análises</CardTitle>
                <CardDescription>
                  Selecione uma análise para exibir no diagrama acima.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {plans.map((plan) => {
                const statusInfo = STATUS_LABELS[plan.status] ?? STATUS_LABELS.draft;
                const isSelected = plan.id === selectedPlanId;
                return (
                  <li
                    key={plan.id}
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors sm:flex-row sm:items-center sm:justify-between",
                      isSelected && "ring-2 ring-primary"
                    )}
                  >
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => handleSelectPlan(plan.id)}
                    >
                      <p className="font-medium text-foreground">{plan.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {plan.year}
                        </span>
                        <span>
                          Criado em {new Date(plan.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <div className="mt-2">
                        <Badge className={cn("text-xs", statusInfo.className)}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant={isSelected ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => handleSelectPlan(plan.id)}
                      >
                        {isSelected ? "Exibindo" : "Exibir"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => router.push(`/escritorio/estrategia/swot/${plan.id}`)}
                        aria-label="Abrir wizard"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => router.push(`/escritorio/estrategia/swot/${plan.id}/historico`)}
                        aria-label="Histórico"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(plan.id)}
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent onClose={() => setDeleteId(null)}>
          <DialogHeader>
            <DialogTitle>Excluir análise SWOT</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Deseja realmente excluir esta análise e todos os dados vinculados?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </PageLayout>
  );
}
