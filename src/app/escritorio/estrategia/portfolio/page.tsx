"use client";

import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Briefcase, Plus, Pencil, Trash2, Download } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import {
  getBaseServices,
  getServicePortfolio,
  createServicePortfolio,
  updateServicePortfolio,
  deleteServicePortfolio,
  type ServicePortfolio,
  type BaseService,
} from "./actions";
import { ExportButton } from "@/components/export/export-button";

const DEMAND_OPTIONS = [
  { value: "", label: "Não definido" },
  { value: "alta", label: "Alta" },
  { value: "baixa", label: "Baixa" },
];

const CAPACITY_OPTIONS = [
  { value: "", label: "Não definido" },
  { value: "alta", label: "Alta" },
  { value: "baixa", label: "Baixa" },
];

const MATRIX_QUADRANTS = [
  { demand: "alta", capacity: "alta", label: "Alta demanda / Alta capacidade", color: "bg-green-100 dark:bg-green-900/30" },
  { demand: "alta", capacity: "baixa", label: "Alta demanda / Baixa capacidade", color: "bg-yellow-100 dark:bg-yellow-900/30" },
  { demand: "baixa", capacity: "alta", label: "Baixa demanda / Alta capacidade", color: "bg-blue-100 dark:bg-blue-900/30" },
  { demand: "baixa", capacity: "baixa", label: "Baixa demanda / Baixa capacidade", color: "bg-gray-100 dark:bg-gray-800" },
] as const;

function CatalogExportMenu({ services }: { services: ServicePortfolio[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Exportar catálogo de serviços"
      >
        <Download className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-md border bg-background shadow-md z-10">
          <div
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
            onClick={() => setOpen(false)}
          >
            <ExportButton
              data={services}
              filename="catalogo-servicos"
              format="pdf"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              Exportar PDF
            </ExportButton>
          </div>
          <div
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
            onClick={() => setOpen(false)}
          >
            <ExportButton
              data={services}
              filename="catalogo-servicos"
              format="docx"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              Exportar DOCX
            </ExportButton>
          </div>
        </div>
      )}
    </div>
  );
}

function MatrixExportMenu({ services }: { services: ServicePortfolio[] }) {
  const [open, setOpen] = useState(false);

  const matrixData = {
    quadrants: MATRIX_QUADRANTS.map((q) => ({
      ...q,
      services: services.filter(
        (s) =>
          (s.demand_level ?? "") === q.demand &&
          (s.capacity_level ?? "") === q.capacity
      ),
    })),
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Exportar matriz demanda x capacidade"
      >
        <Download className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-md border bg-background shadow-md z-10">
          <div
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
            onClick={() => setOpen(false)}
          >
            <ExportButton
              data={matrixData}
              filename="matriz-demanda-capacidade"
              format="pdf"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              Exportar PDF
            </ExportButton>
          </div>
          <div
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
            onClick={() => setOpen(false)}
          >
            <ExportButton
              data={matrixData}
              filename="matriz-demanda-capacidade"
              format="docx"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              Exportar DOCX
            </ExportButton>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PortfolioPage() {
  const [services, setServices] = useState<ServicePortfolio[]>([]);
  const [baseServices, setBaseServices] = useState<BaseService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [baseServiceId, setBaseServiceId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [methodology, setMethodology] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [resources, setResources] = useState("");
  const [team, setTeam] = useState("");
  const [pricing, setPricing] = useState("");
  const [marketing, setMarketing] = useState("");
  const [demandLevel, setDemandLevel] = useState("");
  const [capacityLevel, setCapacityLevel] = useState("");
  const [baseSelectValue, setBaseSelectValue] = useState("");

  async function load() {
    setLoading(true);
    const [portfolioRes, baseRes] = await Promise.all([
      getServicePortfolio(),
      getBaseServices(),
    ]);
    setLoading(false);
    if (portfolioRes.error) setError(portfolioRes.error);
    else setServices(portfolioRes.data ?? []);
    if (baseRes.error) setError(baseRes.error);
    else setBaseServices(baseRes.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setEditingId(null);
    setBaseServiceId("");
    setName("");
    setDescription("");
    setMethodology("");
    setDeliverables("");
    setResources("");
    setTeam("");
    setPricing("");
    setMarketing("");
    setDemandLevel("");
    setCapacityLevel("");
  }

  function openFromBase(base: BaseService) {
    resetForm();
    setBaseServiceId(base.id);
    setName(base.name);
    setDescription(base.description ?? "");
    setMethodology(base.methodology ?? "");
    setDeliverables(base.deliverables ?? "");
    setShowDialog(true);
  }

  function openCustom() {
    resetForm();
    setBaseServiceId("");
    setShowDialog(true);
  }

  function openEdit(service: ServicePortfolio) {
    setEditingId(service.id);
    setBaseServiceId(service.base_service_id ?? "");
    setName(service.name);
    setDescription(service.description ?? "");
    setMethodology(service.methodology ?? "");
    setDeliverables(service.deliverables ?? "");
    setResources(service.resources ?? "");
    setTeam(service.team ?? "");
    setPricing(service.pricing ?? "");
    setMarketing(service.marketing ?? "");
    setDemandLevel(service.demand_level ?? "");
    setCapacityLevel(service.capacity_level ?? "");
    setShowDialog(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (editingId) {
      const result = await updateServicePortfolio(editingId, {
        name,
        description: description || null,
        methodology: methodology || null,
        deliverables: deliverables || null,
        resources: resources || null,
        team: team || null,
        pricing: pricing || null,
        marketing: marketing || null,
        demand_level: demandLevel || null,
        capacity_level: capacityLevel || null,
      });
      if (result.error) setError(result.error);
      else {
        setShowDialog(false);
        resetForm();
        load();
      }
    } else {
      const result = await createServicePortfolio({
        base_service_id: baseServiceId || null,
        name,
        description: description || undefined,
        methodology: methodology || undefined,
        deliverables: deliverables || undefined,
        resources: resources || undefined,
        team: team || undefined,
        pricing: pricing || undefined,
        marketing: marketing || undefined,
        demand_level: demandLevel || null,
        capacity_level: capacityLevel || null,
        is_custom: !baseServiceId,
      });
      if (result.error) setError(result.error);
      else {
        setShowDialog(false);
        resetForm();
        load();
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este serviço?")) return;
    setError(null);
    const result = await deleteServicePortfolio(id);
    if (result.error) setError(result.error);
    else load();
  }

  function getServicesInQuadrant(demand: string, capacity: string): ServicePortfolio[] {
    return services.filter(
      (s) =>
        (s.demand_level ?? "") === demand &&
        (s.capacity_level ?? "") === capacity
    );
  }

  if (loading) {
    return (
      <PageLayout
        title="Portfólio de Serviços"
        description="Carregando..."
        icon={Briefcase}
        backHref="/escritorio/estrategia"
      >
        <p className="text-muted-foreground">Carregando...</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Portfólio de Serviços"
      description="Gerencie o catálogo de serviços e visualize demanda x capacidade."
      icon={Briefcase}
      backHref="/escritorio/estrategia"
    >
      <div className="space-y-8">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {/* Service Cards */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Catálogo de Serviços</CardTitle>
              <CardDescription>
                Serviços oferecidos pelo escritório.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <CatalogExportMenu services={services} />
              {baseServices.length > 0 && (
                <Select
                  value={baseSelectValue}
                  onChange={(e) => {
                    const id = e.target.value;
                    setBaseSelectValue("");
                    if (id) {
                      const base = baseServices.find((b) => b.id === id);
                      if (base) openFromBase(base);
                    }
                  }}
                  className="w-[200px]"
                >
                  <option value="">A partir de serviço base...</option>
                  {baseServices.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              )}
              <Button onClick={openCustom}>
                <Plus className="h-4 w-4" />
                Novo serviço customizado
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card key={service.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{service.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(service)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(service.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {service.description && (
                    <CardDescription className="line-clamp-2">
                      {service.description}
                    </CardDescription>
                  )}
                  <div className="flex gap-1 flex-wrap">
                    {service.is_custom && (
                      <Badge variant="outline">Customizado</Badge>
                    )}
                    {service.demand_level && (
                      <Badge variant="secondary">
                        Demanda: {service.demand_level}
                      </Badge>
                    )}
                    {service.capacity_level && (
                      <Badge variant="secondary">
                        Capacidade: {service.capacity_level}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
            {services.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground py-8 text-center">
                Nenhum serviço no portfólio.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Demand x Capacity Matrix */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Matriz Demanda x Capacidade</CardTitle>
              <CardDescription>
                Posicione os serviços nos quadrantes conforme demanda e capacidade.
              </CardDescription>
            </div>
            <MatrixExportMenu services={services} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {MATRIX_QUADRANTS.map((q) => {
              const items = getServicesInQuadrant(q.demand, q.capacity);
              return (
                <div
                  key={`${q.demand}-${q.capacity}`}
                  className={`rounded-lg border p-4 min-h-[120px] ${q.color}`}
                >
                  <p className="text-sm font-medium mb-2">{q.label}</p>
                  <div className="space-y-1">
                    {items.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between text-sm bg-background/60 rounded px-2 py-1"
                      >
                        <span>{s.name}</span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(s)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(s.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <p className="text-xs text-muted-foreground">Nenhum serviço</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar serviço" : "Novo serviço"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do serviço.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
            {!editingId && baseServices.length > 0 && !baseServiceId && (
              <p className="text-sm text-muted-foreground">
                Criando serviço customizado. Para usar um serviço base, selecione no botão acima.
              </p>
            )}
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do serviço"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição do serviço"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Metodologia</Label>
              <Textarea
                value={methodology}
                onChange={(e) => setMethodology(e.target.value)}
                placeholder="Metodologia utilizada"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Entregas</Label>
              <Textarea
                value={deliverables}
                onChange={(e) => setDeliverables(e.target.value)}
                placeholder="Principais entregas"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Recursos</Label>
              <Input
                value={resources}
                onChange={(e) => setResources(e.target.value)}
                placeholder="Recursos necessários"
              />
            </div>
            <div className="space-y-2">
              <Label>Equipe</Label>
              <Input
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder="Equipe responsável"
              />
            </div>
            <div className="space-y-2">
              <Label>Precificação</Label>
              <Input
                value={pricing}
                onChange={(e) => setPricing(e.target.value)}
                placeholder="Modelo de precificação"
              />
            </div>
            <div className="space-y-2">
              <Label>Marketing</Label>
              <Textarea
                value={marketing}
                onChange={(e) => setMarketing(e.target.value)}
                placeholder="Estratégias de marketing"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nível de demanda</Label>
                <Select
                  value={demandLevel}
                  onChange={(e) => setDemandLevel(e.target.value)}
                >
                  {DEMAND_OPTIONS.map((o) => (
                    <option key={o.value || "empty"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nível de capacidade</Label>
                <Select
                  value={capacityLevel}
                  onChange={(e) => setCapacityLevel(e.target.value)}
                >
                  {CAPACITY_OPTIONS.map((o) => (
                    <option key={o.value || "empty"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </PageLayout>
  );
}
