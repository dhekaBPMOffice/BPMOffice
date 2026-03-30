"use client";

import { useEffect, useMemo, useState } from "react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Briefcase, Plus, Pencil, Trash2, Download, LayoutGrid, List, Search } from "lucide-react";
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

type CatalogViewMode = "cards" | "list";
type CatalogFilterOrigin = "all" | "custom" | "from_base";
type CatalogFilterLevel = "all" | "alta" | "baixa" | "unset";
type CatalogSortBy = "name_asc" | "name_desc" | "created_desc" | "created_asc" | "updated_desc";

const CATALOG_SORT_OPTIONS: { value: CatalogSortBy; label: string }[] = [
  { value: "name_asc", label: "Nome A–Z" },
  { value: "name_desc", label: "Nome Z–A" },
  { value: "created_desc", label: "Mais recentes" },
  { value: "created_asc", label: "Mais antigos" },
  { value: "updated_desc", label: "Última atualização" },
];

function matchesLevelFilter(value: string | null, filter: CatalogFilterLevel): boolean {
  if (filter === "all") return true;
  const v = (value ?? "").trim().toLowerCase();
  if (filter === "unset") return v === "";
  return v === filter;
}

function sortPortfolioServices(a: ServicePortfolio, b: ServicePortfolio, sortBy: CatalogSortBy): number {
  switch (sortBy) {
    case "name_asc":
      return a.name.localeCompare(b.name, "pt");
    case "name_desc":
      return b.name.localeCompare(a.name, "pt");
    case "created_desc":
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    case "created_asc":
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    case "updated_desc":
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    default:
      return 0;
  }
}

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
              documentType="catalogo_servicos"
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
              documentType="catalogo_servicos"
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
              documentType="matriz_demanda_capacidade"
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
              documentType="matriz_demanda_capacidade"
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
  const [catalogoComplementarOpen, setCatalogoComplementarOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [catalogViewMode, setCatalogViewMode] = useState<CatalogViewMode>("cards");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [filterOrigin, setFilterOrigin] = useState<CatalogFilterOrigin>("all");
  const [filterDemand, setFilterDemand] = useState<CatalogFilterLevel>("all");
  const [filterCapacity, setFilterCapacity] = useState<CatalogFilterLevel>("all");
  const [catalogSortBy, setCatalogSortBy] = useState<CatalogSortBy>("name_asc");

  const displayedServices = useMemo(() => {
    let list = [...services];
    const q = catalogSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description ?? "").toLowerCase().includes(q)
      );
    }
    if (filterOrigin === "custom") list = list.filter((s) => s.is_custom);
    if (filterOrigin === "from_base") list = list.filter((s) => !s.is_custom);
    list = list.filter((s) => matchesLevelFilter(s.demand_level, filterDemand));
    list = list.filter((s) => matchesLevelFilter(s.capacity_level, filterCapacity));
    list.sort((a, b) => sortPortfolioServices(a, b, catalogSortBy));
    return list;
  }, [services, catalogSearch, filterOrigin, filterDemand, filterCapacity, catalogSortBy]);

  const availableBaseServices = useMemo(() => {
    const selectedIds = new Set(
      services.map((s) => s.base_service_id).filter((id): id is string => id != null)
    );
    return baseServices.filter((b) => !selectedIds.has(b.id));
  }, [baseServices, services]);

  async function load(options?: { showSpinner?: boolean }): Promise<{ baseServicesCount: number }> {
    const showSpinner = options?.showSpinner !== false;
    if (showSpinner) setLoading(true);
    const [portfolioRes, baseRes] = await Promise.all([
      getServicePortfolio(),
      getBaseServices(),
    ]);
    if (showSpinner) setLoading(false);
    if (portfolioRes.error) setError(portfolioRes.error);
    else setServices(portfolioRes.data ?? []);
    if (baseRes.error) setError(baseRes.error);
    else setBaseServices(baseRes.data ?? []);
    return { baseServicesCount: (baseRes.data ?? []).length };
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
    setCatalogoComplementarOpen(false);
    setShowDialog(true);
  }

  function openCustom() {
    resetForm();
    setBaseServiceId("");
    setShowDialog(true);
  }

  function clearCatalogFilters() {
    setCatalogSearch("");
    setFilterOrigin("all");
    setFilterDemand("all");
    setFilterCapacity("all");
    setCatalogSortBy("name_asc");
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

  async function handleSubmitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError(null);
    setSaving(true);
    try {
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
        await load({ showSpinner: false });
      }
    } finally {
      setSaving(false);
    }
  }

  async function submitNewService(finish: boolean) {
    if (!name.trim()) {
      setError("Informe o nome do serviço.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
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
      if (result.error) {
        setError(result.error);
        return;
      }
      const { baseServicesCount } = await load({ showSpinner: false });
      resetForm();
      setShowDialog(false);
      if (!finish) {
        if (baseServicesCount > 0) {
          setCatalogoComplementarOpen(true);
        } else {
          setShowDialog(true);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este serviço?")) return;
    setError(null);
    const result = await deleteServicePortfolio(id);
    if (result.error) setError(result.error);
    else await load({ showSpinner: false });
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
            <div className="flex flex-wrap items-center gap-2">
              <CatalogExportMenu services={displayedServices} />
              {baseServices.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCatalogoComplementarOpen(true)}
                >
                  Catálogo complementar
                </Button>
              )}
              <Button onClick={openCustom}>
                <Plus className="h-4 w-4" />
                Novo serviço customizado
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {services.length > 0 && (
            <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Buscar por nome ou descrição..."
                  className="pl-9"
                  aria-label="Buscar no catálogo"
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <div className="space-y-1.5 min-w-[140px]">
                  <Label className="text-xs text-muted-foreground">Origem</Label>
                  <Select
                    value={filterOrigin}
                    onChange={(e) => setFilterOrigin(e.target.value as CatalogFilterOrigin)}
                    aria-label="Filtrar por origem"
                  >
                    <option value="all">Todas</option>
                    <option value="custom">Customizado</option>
                    <option value="from_base">Catálogo base</option>
                  </Select>
                </div>
                <div className="space-y-1.5 min-w-[140px]">
                  <Label className="text-xs text-muted-foreground">Demanda</Label>
                  <Select
                    value={filterDemand}
                    onChange={(e) => setFilterDemand(e.target.value as CatalogFilterLevel)}
                    aria-label="Filtrar por demanda"
                  >
                    <option value="all">Todas</option>
                    <option value="unset">Não definido</option>
                    <option value="alta">Alta</option>
                    <option value="baixa">Baixa</option>
                  </Select>
                </div>
                <div className="space-y-1.5 min-w-[140px]">
                  <Label className="text-xs text-muted-foreground">Capacidade</Label>
                  <Select
                    value={filterCapacity}
                    onChange={(e) => setFilterCapacity(e.target.value as CatalogFilterLevel)}
                    aria-label="Filtrar por capacidade"
                  >
                    <option value="all">Todas</option>
                    <option value="unset">Não definido</option>
                    <option value="alta">Alta</option>
                    <option value="baixa">Baixa</option>
                  </Select>
                </div>
                <div className="space-y-1.5 min-w-[180px]">
                  <Label className="text-xs text-muted-foreground">Ordenar</Label>
                  <Select
                    value={catalogSortBy}
                    onChange={(e) => setCatalogSortBy(e.target.value as CatalogSortBy)}
                    aria-label="Ordenar catálogo"
                  >
                    {CATALOG_SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-end gap-1 pb-0.5">
                  <Button
                    type="button"
                    size="icon"
                    variant={catalogViewMode === "cards" ? "default" : "outline"}
                    aria-pressed={catalogViewMode === "cards"}
                    aria-label="Ver em cards"
                    onClick={() => setCatalogViewMode("cards")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant={catalogViewMode === "list" ? "default" : "outline"}
                    aria-pressed={catalogViewMode === "list"}
                    aria-label="Ver em lista"
                    onClick={() => setCatalogViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum serviço no portfólio.</p>
          ) : displayedServices.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhum serviço corresponde aos filtros.</p>
              <Button type="button" variant="outline" size="sm" onClick={clearCatalogFilters}>
                Limpar filtros
              </Button>
            </div>
          ) : catalogViewMode === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayedServices.map((service) => (
                <Card
                  key={service.id}
                  className="border-border/70 bg-muted/30 !shadow-md ring-1 ring-border/35 transition-shadow hover:!shadow-lg hover:ring-border/45 dark:bg-muted/20"
                >
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
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="hidden md:table-cell px-3 py-2 font-medium">Descrição</th>
                    <th className="px-3 py-2 font-medium">Origem</th>
                    <th className="hidden sm:table-cell px-3 py-2 font-medium">Demanda</th>
                    <th className="hidden sm:table-cell px-3 py-2 font-medium">Capacidade</th>
                    <th className="w-[100px] px-3 py-2 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedServices.map((service) => (
                    <tr
                      key={service.id}
                      className="border-b border-border/50 last:border-0 transition-colors hover:bg-muted/40"
                    >
                      <td className="px-3 py-2 align-top font-medium">{service.name}</td>
                      <td className="hidden md:table-cell max-w-[240px] px-3 py-2 align-top text-muted-foreground">
                        <span className="line-clamp-2">{service.description || "—"}</span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        {service.is_custom ? (
                          <Badge variant="outline">Customizado</Badge>
                        ) : (
                          <Badge variant="secondary">Catálogo base</Badge>
                        )}
                      </td>
                      <td className="hidden sm:table-cell px-3 py-2 align-top text-muted-foreground">
                        {service.demand_level || "—"}
                      </td>
                      <td className="hidden sm:table-cell px-3 py-2 align-top text-muted-foreground">
                        {service.capacity_level || "—"}
                      </td>
                      <td className="px-3 py-2 align-top text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(service)}
                            aria-label={`Editar ${service.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDelete(service.id)}
                            aria-label={`Excluir ${service.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

      <Dialog
        open={catalogoComplementarOpen}
        onOpenChange={setCatalogoComplementarOpen}
        containerClassName="max-w-5xl"
      >
        <DialogContent className="max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Catálogo complementar</DialogTitle>
            <DialogDescription>
              Serviços padrão da plataforma que ainda não estão no portfólio do escritório. Escolha um
              para preencher o formulário ou feche e use &quot;Novo serviço customizado&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 overflow-y-auto max-h-[min(70vh,720px)]">
            {availableBaseServices.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="Todos os serviços base já foram adicionados"
                description="O portfólio já inclui todos os serviços ativos do catálogo padrão, ou você pode criar um serviço customizado."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {availableBaseServices.map((base) => (
                  <Card key={base.id} className="border border-border/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{base.name}</CardTitle>
                      <CardDescription>
                        {base.methodology?.trim() || "Sem metodologia cadastrada"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {base.description || "Sem descrição cadastrada."}
                      </p>
                      <Button size="sm" onClick={() => openFromBase(base)}>
                        Adicionar ao portfólio
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
          <form
            onSubmit={editingId ? handleSubmitEdit : (e) => e.preventDefault()}
            className="space-y-4 max-h-[70vh] overflow-y-auto"
          >
            {!editingId && baseServices.length > 0 && !baseServiceId && (
              <p className="text-sm text-muted-foreground">
                Criando serviço customizado. Para partir de um serviço base, use o botão
                &quot;Catálogo complementar&quot; ao lado de &quot;Novo serviço customizado&quot;.
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
            <DialogFooter className="flex flex-wrap gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setShowDialog(false)}
              >
                Cancelar
              </Button>
              {editingId ? (
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => submitNewService(false)}
                  >
                    {saving ? "Salvando..." : "Adicionar outro"}
                  </Button>
                  <Button type="button" disabled={saving} onClick={() => submitNewService(true)}>
                    {saving ? "Salvando..." : "Finalizar"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </PageLayout>
  );
}
