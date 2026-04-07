"use client";

import { useEffect, useState, useCallback } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Plus, Pencil, Trash2, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  DocumentTemplate,
  DocumentTypeConfig,
  DocumentTemplateStyles,
  DocumentSectionConfig,
  BrandingMapping,
  BrandingMappingValue,
} from "@/types/database";
import dynamic from "next/dynamic";
import { DEFAULT_STYLES, parseStyles, mergeStyleOverrides } from "./lib";
import { StylePanel } from "./style-panel";
import { DocumentPreview } from "./document-preview";
import {
  saveTemplate,
  deleteTemplate,
  saveTypeConfig,
} from "./actions";

const SectionEditor = dynamic(() => import("./section-editor").then((m) => m.SectionEditor), {
  ssr: false,
  loading: () => <p className="text-sm text-muted-foreground py-4">Carregando editor...</p>,
});

// ---------------------------------------------------------------------------
// Branding mapping helpers
// ---------------------------------------------------------------------------

const BRANDING_FIELDS: { key: string; label: string; default: BrandingMappingValue }[] = [
  { key: "title.color", label: "Cor do título", default: "primary_color" },
  { key: "subtitle.color", label: "Cor do subtítulo", default: "primary_color" },
  { key: "tableHeader.color", label: "Cor do cabeçalho de tabela", default: "primary_color" },
];

const BRANDING_VALUE_LABELS: Record<BrandingMappingValue, string> = {
  primary_color: "Cor primária",
  secondary_color: "Cor secundária",
  accent_color: "Cor de destaque",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ModelosDocumentoPage() {
  const supabase = createClient();

  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [configs, setConfigs] = useState<DocumentTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Template dialog
  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [tplEditId, setTplEditId] = useState<string | null>(null);
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  const [tplStyles, setTplStyles] = useState<DocumentTemplateStyles>(DEFAULT_STYLES);
  const [tplIsDefault, setTplIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  // Type config editing
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [cfgTemplateId, setCfgTemplateId] = useState<string | null>(null);
  const [cfgOverrides, setCfgOverrides] = useState<Partial<DocumentTemplateStyles>>({});
  const [cfgSections, setCfgSections] = useState<DocumentSectionConfig[]>([]);
  const [cfgBrandingMap, setCfgBrandingMap] = useState<BrandingMapping>({});
  const [cfgSaving, setCfgSaving] = useState(false);

  const [overrideEnabled, setOverrideEnabled] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tplRes, cfgRes] = await Promise.all([
        supabase.from("document_templates").select("*").order("is_default", { ascending: false }).order("name"),
        supabase.from("document_type_configs").select("*").order("label"),
      ]);
      if (tplRes.error) setError(tplRes.error.message);
      else setTemplates((tplRes.data ?? []) as DocumentTemplate[]);
      if (cfgRes.error) setError(cfgRes.error.message);
      else setConfigs((cfgRes.data ?? []) as DocumentTypeConfig[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados. Verifique se a migração 024 foi aplicada.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Template CRUD
  function openNewTemplate() {
    setTplEditId(null);
    setTplName("");
    setTplDesc("");
    setTplStyles({ ...DEFAULT_STYLES });
    setTplIsDefault(false);
    setTplDialogOpen(true);
  }

  function openEditTemplate(t: DocumentTemplate) {
    setTplEditId(t.id);
    setTplName(t.name);
    setTplDesc(t.description ?? "");
    setTplStyles(parseStyles(t.styles));
    setTplIsDefault(t.is_default);
    setTplDialogOpen(true);
  }

  async function handleSaveTemplate() {
    if (!tplName.trim()) return;
    setSaving(true);
    setError(null);
    const result = await saveTemplate({
      id: tplEditId ?? undefined,
      name: tplName.trim(),
      description: tplDesc.trim() || null,
      styles: tplStyles,
      is_default: tplIsDefault,
    });
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    setTplDialogOpen(false);
    await load();
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm("Excluir este modelo?")) return;
    setError(null);
    const result = await deleteTemplate(id);
    if (result.error) setError(result.error);
    else await load();
  }

  // Type config editing
  function selectConfig(id: string) {
    const cfg = configs.find((c) => c.id === id);
    if (!cfg) return;
    setSelectedConfigId(id);
    setCfgTemplateId(cfg.template_id);
    setCfgOverrides((cfg.style_overrides ?? {}) as Partial<DocumentTemplateStyles>);
    setCfgSections(Array.isArray(cfg.sections) ? cfg.sections : []);
    setCfgBrandingMap((cfg.branding_mapping ?? {}) as BrandingMapping);
    const ov = (cfg.style_overrides ?? {}) as Record<string, unknown>;
    setOverrideEnabled({
      fontFamily: !!ov.fontFamily,
      title: !!ov.title,
      subtitle: !!ov.subtitle,
      body: !!ov.body,
      tableHeader: !!ov.tableHeader,
      spacing: !!ov.spacing,
      margins: !!ov.margins,
    });
  }

  const selectedConfig = configs.find((c) => c.id === selectedConfigId);
  const baseTemplate = templates.find((t) => t.id === cfgTemplateId);
  const baseStyles = baseTemplate ? parseStyles(baseTemplate.styles) : DEFAULT_STYLES;
  const effectiveStyles = mergeStyleOverrides(baseStyles, cfgOverrides);

  function toggleOverrideGroup(group: string, enabled: boolean) {
    setOverrideEnabled((prev) => ({ ...prev, [group]: enabled }));
    if (!enabled) {
      const next = { ...cfgOverrides };
      delete (next as Record<string, unknown>)[group];
      setCfgOverrides(next);
    } else {
      setCfgOverrides({
        ...cfgOverrides,
        [group]: (baseStyles as unknown as Record<string, unknown>)[group],
      });
    }
  }

  function handleCfgStylesChange(updated: DocumentTemplateStyles) {
    const partial: Partial<DocumentTemplateStyles> = {};
    if (overrideEnabled.fontFamily) partial.fontFamily = updated.fontFamily;
    if (overrideEnabled.title) partial.title = updated.title;
    if (overrideEnabled.subtitle) partial.subtitle = updated.subtitle;
    if (overrideEnabled.body) partial.body = updated.body;
    if (overrideEnabled.tableHeader) partial.tableHeader = updated.tableHeader;
    if (overrideEnabled.spacing) partial.spacing = updated.spacing;
    if (overrideEnabled.margins) partial.margins = updated.margins;
    setCfgOverrides(partial);
  }

  async function handleSaveConfig() {
    if (!selectedConfigId) return;
    setCfgSaving(true);
    setError(null);
    const result = await saveTypeConfig({
      id: selectedConfigId,
      template_id: cfgTemplateId,
      style_overrides: cfgOverrides,
      sections: cfgSections,
      branding_mapping: cfgBrandingMap,
    });
    setCfgSaving(false);
    if (result.error) { setError(result.error); return; }
    await load();
  }

  if (loading) {
    return (
      <PageLayout title="Modelos de Documento" description="Carregando..." iconName="FileText">
        <p className="text-muted-foreground">Carregando...</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Modelos de Documento"
      description="Configure os modelos de exportação PDF/DOCX para cada tipo de documento do sistema."
      iconName="FileText"
    >
      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Modelos Base</TabsTrigger>
          <TabsTrigger value="types">Tipos de Documento</TabsTrigger>
        </TabsList>

        {/* ================================================================
            ABA 1 — Modelos Base
        ================================================================ */}
        <TabsContent value="templates">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openNewTemplate}>
                <Plus className="h-4 w-4" />
                Novo modelo
              </Button>
            </div>

            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                Nenhum modelo cadastrado.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((t) => {
                  const s = parseStyles(t.styles);
                  return (
                    <Card key={t.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              {t.name}
                              {t.is_default && (
                                <Badge variant="secondary" className="text-[10px]">
                                  <Star className="h-3 w-3 mr-0.5" />
                                  Padrão
                                </Badge>
                              )}
                            </CardTitle>
                            {t.description && (
                              <CardDescription className="mt-1">{t.description}</CardDescription>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTemplate(t)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteTemplate(t.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>Fonte: {s.fontFamily}</p>
                          <p>Título: {s.title.fontSize}pt {s.title.bold ? "Bold" : ""}</p>
                          <p>Corpo: {s.body.fontSize}pt</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dialog para criar/editar modelo */}
          <Dialog open={tplDialogOpen} onOpenChange={setTplDialogOpen} containerClassName="max-w-2xl">
            <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden">
              <DialogHeader>
                <DialogTitle>{tplEditId ? "Editar modelo" : "Novo modelo"}</DialogTitle>
                <DialogDescription>
                  Configure os estilos de exportação deste modelo.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="Ex: Padrão" />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea value={tplDesc} onChange={(e) => setTplDesc(e.target.value)} rows={1} placeholder="Descrição breve" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={tplIsDefault} onCheckedChange={setTplIsDefault} />
                  <Label className="text-sm">Definir como modelo padrão</Label>
                </div>
                <StylePanel styles={tplStyles} onChange={setTplStyles} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTplDialogOpen(false)} disabled={saving}>Cancelar</Button>
                <Button onClick={handleSaveTemplate} disabled={saving || !tplName.trim()}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ================================================================
            ABA 2 — Tipos de Documento
        ================================================================ */}
        <TabsContent value="types">
          <div className="space-y-4">
            <div className="max-w-xs space-y-2">
              <Label className="text-sm">Selecione o tipo de documento</Label>
              <Select
                value={selectedConfigId ?? ""}
                onChange={(e) => { if (e.target.value) selectConfig(e.target.value); }}
              >
                <option value="">— Selecionar —</option>
                {configs.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </Select>
            </div>

            {selectedConfig && (
              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                {/* Painel de configuração */}
                <div className="space-y-6">
                  {/* Modelo base */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Modelo base</CardTitle>
                      <CardDescription>
                        Selecione o modelo de estilos. Você pode personalizar grupos individualmente.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Select
                        value={cfgTemplateId ?? ""}
                        onChange={(e) => setCfgTemplateId(e.target.value || null)}
                      >
                        <option value="">— Nenhum —</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}{t.is_default ? " (padrão)" : ""}
                          </option>
                        ))}
                      </Select>
                    </CardContent>
                  </Card>

                  {/* Personalizações de estilo */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Personalizar estilos</CardTitle>
                      <CardDescription>
                        Ative os grupos que deseja sobrescrever neste tipo de documento.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { key: "fontFamily", label: "Fonte" },
                        { key: "title", label: "Título" },
                        { key: "subtitle", label: "Subtítulo" },
                        { key: "body", label: "Corpo" },
                        { key: "tableHeader", label: "Cabeçalho de tabela" },
                        { key: "spacing", label: "Espaçamento" },
                        { key: "margins", label: "Margens" },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-3">
                          <Switch
                            checked={overrideEnabled[key] ?? false}
                            onCheckedChange={(v) => toggleOverrideGroup(key, v)}
                          />
                          <span className="text-sm">{label}</span>
                        </div>
                      ))}

                      {Object.values(overrideEnabled).some(Boolean) && (
                        <div className="pt-2 border-t">
                          <StylePanel styles={effectiveStyles} onChange={handleCfgStylesChange} />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Seções */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Seções do documento</CardTitle>
                      <CardDescription>
                        Reordene, edite ou adicione blocos de texto entre as seções de dados.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <SectionEditor sections={cfgSections} onChange={setCfgSections} />
                    </CardContent>
                  </Card>

                  {/* Mapeamento de identidade visual */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Identidade visual</CardTitle>
                      <CardDescription>
                        Defina quais cores do documento usam a identidade visual do escritório.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {BRANDING_FIELDS.map((bf) => {
                        const active = bf.key in cfgBrandingMap;
                        const current = cfgBrandingMap[bf.key] ?? bf.default;
                        return (
                          <div key={bf.key} className="space-y-2 rounded-lg border p-3">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={active}
                                onCheckedChange={(v) => {
                                  const next = { ...cfgBrandingMap };
                                  if (v) next[bf.key] = bf.default;
                                  else delete next[bf.key];
                                  setCfgBrandingMap(next);
                                }}
                              />
                              <span className="text-sm">{bf.label}</span>
                            </div>
                            {active && (
                              <Select
                                value={current}
                                onChange={(e) => setCfgBrandingMap({ ...cfgBrandingMap, [bf.key]: e.target.value as BrandingMappingValue })}
                                className="h-8 text-sm"
                              >
                                {Object.entries(BRANDING_VALUE_LABELS).map(([v, l]) => (
                                  <option key={v} value={v}>{l}</option>
                                ))}
                              </Select>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {/* Salvar */}
                  <Button onClick={handleSaveConfig} disabled={cfgSaving} className="w-full">
                    {cfgSaving ? "Salvando..." : "Salvar configuração"}
                  </Button>
                </div>

                {/* Painel de preview */}
                <div className="xl:sticky xl:top-4 xl:self-start">
                  <DocumentPreview
                    styles={effectiveStyles}
                    sections={cfgSections}
                    brandingMapping={cfgBrandingMap}
                  />
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
