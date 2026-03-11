"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, TrendingUp, TrendingDown, Lightbulb, ShieldAlert, Pencil, Sparkles, Loader2, GripVertical } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  createSwotItem,
  deleteSwotItem,
  updateSwotItem,
  type SwotItem,
  type SwotType,
} from "../actions";

const QUADRANT_QUESTIONS: Record<SwotType, { label: string; placeholder: string }[]> = {
  strength: [
    { label: "Quais são os principais recursos ou competências da organização?", placeholder: "Ex.: equipe qualificada, tecnologia..." },
    { label: "Que diferenciais você enxerga?", placeholder: "Ex.: marca, localização..." },
  ],
  weakness: [
    { label: "Quais pontos fracos ou limitações você identifica?", placeholder: "Ex.: dependência de poucos clientes..." },
    { label: "O que precisa ser melhorado?", placeholder: "Ex.: processos, capacitação..." },
  ],
  opportunity: [
    { label: "Quais tendências ou mudanças externas podem ser aproveitadas?", placeholder: "Ex.: mercado em crescimento..." },
    { label: "Que portas se abrem?", placeholder: "Ex.: parcerias, novos canais..." },
  ],
  threat: [
    { label: "Quais riscos ou fatores externos negativos preocupam?", placeholder: "Ex.: concorrência, regulamentação..." },
    { label: "O que pode atrapalhar?", placeholder: "Ex.: crise setorial, custos..." },
  ],
};

export const SWOT_CONFIG: {
  key: SwotType;
  label: string;
  icon: typeof TrendingUp;
  bgClass: string;
  borderClass: string;
  iconClass: string;
  helpText: string;
}[] = [
  { key: "strength", label: "Forças", icon: TrendingUp, bgClass: "bg-emerald-50", borderClass: "border-emerald-200", iconClass: "text-emerald-600", helpText: "Pontos positivos internos da organização." },
  { key: "weakness", label: "Fraquezas", icon: TrendingDown, bgClass: "bg-red-50", borderClass: "border-red-200", iconClass: "text-red-600", helpText: "Pontos fracos internos." },
  { key: "opportunity", label: "Oportunidades", icon: Lightbulb, bgClass: "bg-blue-50", borderClass: "border-blue-200", iconClass: "text-blue-600", helpText: "Fatores externos positivos que você pode aproveitar." },
  { key: "threat", label: "Ameaças", icon: ShieldAlert, bgClass: "bg-amber-50", borderClass: "border-amber-200", iconClass: "text-amber-600", helpText: "Fatores externos negativos que podem afetar o negócio." },
];

function SwotItemCard({
  item,
  icon: Icon,
  iconClass,
  onEdit,
  onDelete,
}: {
  item: SwotItem;
  icon: typeof TrendingUp;
  iconClass: string;
  onEdit: (item: SwotItem) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { type: item.type },
  });
  return (
    <li
      ref={setNodeRef}
      className={`flex items-center gap-2 rounded-lg bg-white/90 border shadow-sm p-3 text-sm group hover:shadow transition-shadow ${isDragging ? "opacity-50 shadow-md" : ""}`}
    >
      <button
        type="button"
        className="touch-none cursor-grab active:cursor-grabbing shrink-0 text-muted-foreground hover:text-foreground p-0.5 rounded"
        {...listeners}
        {...attributes}
        title="Arrastar para outro quadrante"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Icon className={`h-4 w-4 shrink-0 ${iconClass} opacity-80`} />
      <span className="flex-1 min-w-0">{item.content}</span>
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(item)}
          title="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(item.id)}
          title="Remover"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}

type QuadrantConfig = (typeof SWOT_CONFIG)[number];

function QuadrantCard({
  config,
  items,
  addingType,
  newContent,
  setNewContent,
  setAddingType,
  onAdd,
  onEdit,
  onDelete,
  onAiClick,
}: {
  config: QuadrantConfig;
  items: SwotItem[];
  addingType: SwotType | null;
  newContent: string;
  setNewContent: (v: string) => void;
  setAddingType: (t: SwotType | null) => void;
  onAdd: (type: SwotType) => void;
  onEdit: (item: SwotItem) => void;
  onDelete: (id: string) => void;
  onAiClick: () => void;
}) {
  const { key, label, icon: Icon, bgClass, borderClass, iconClass, helpText } = config;
  const { setNodeRef, isOver } = useDroppable({ id: key });
  return (
    <div ref={setNodeRef} className={isOver ? "rounded-lg ring-2 ring-teal-400 ring-offset-2" : ""}>
      <Card className={`${borderClass} ${bgClass}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${iconClass}`} />
              <CardTitle className="text-base">{label}</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {items.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{helpText}</p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 mb-3">
            {items.map((item) => (
              <SwotItemCard
                key={item.id}
                item={item}
                icon={Icon}
                iconClass={iconClass}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
            {items.length === 0 && (
              <li className="text-sm text-muted-foreground py-4 text-center rounded-lg border border-dashed">
                Nenhum item adicionado
              </li>
            )}
          </ul>
          {addingType === key ? (
            <div className="flex gap-2">
              <Input
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Digite o item..."
                className="bg-white"
                onKeyDown={(e) => { if (e.key === "Enter") onAdd(key); }}
                autoFocus
              />
              <Button size="sm" onClick={() => onAdd(key)} className="shrink-0">Adicionar</Button>
              <Button variant="ghost" size="sm" onClick={() => { setAddingType(null); setNewContent(""); }} className="shrink-0">Cancelar</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button variant="ghost" size="sm" className="w-full border border-dashed" onClick={() => { setAddingType(key); setNewContent(""); }}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar item
              </Button>
              <Button variant="outline" size="sm" className="w-full gap-2 bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100" onClick={onAiClick}>
                <Sparkles className="h-4 w-4" /> Pedir ajuda à IA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export interface SwotMatrixProps {
  planId: string;
  planName: string;
  mission?: string | null;
  vision?: string | null;
  swotItems: SwotItem[];
  onReload: () => Promise<void>;
}

export function SwotMatrix({ planId, planName, mission, vision, swotItems, onReload }: SwotMatrixProps) {
  const [addingType, setAddingType] = useState<SwotType | null>(null);
  const [newContent, setNewContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<SwotItem | null>(null);
  const [editContent, setEditContent] = useState("");
  const [aiQuadrant, setAiQuadrant] = useState<SwotType | null>(null);
  const [aiQuadrantAnswers, setAiQuadrantAnswers] = useState<string[]>([]);
  const [aiQuadrantLoading, setAiQuadrantLoading] = useState(false);
  const [aiQuadrantError, setAiQuadrantError] = useState<string | null>(null);

  useEffect(() => {
    if (aiQuadrant != null) {
      setAiQuadrantAnswers(QUADRANT_QUESTIONS[aiQuadrant].map(() => ""));
    }
  }, [aiQuadrant]);

  function getItemsByType(type: SwotType): SwotItem[] {
    return swotItems.filter((i) => i.type === type);
  }

  async function handleAdd(type: SwotType) {
    if (!newContent.trim()) return;
    setError(null);
    const result = await createSwotItem(type, newContent.trim(), "escritorio", planId);
    if (result.error) {
      setError(result.error);
    } else {
      setNewContent("");
      setAddingType(null);
      await onReload();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este item?")) return;
    const result = await deleteSwotItem(id);
    if (result.error) setError(result.error);
    else await onReload();
  }

  function openEdit(item: SwotItem) {
    setEditItem(item);
    setEditContent(item.content);
  }

  async function handleSaveEdit() {
    if (!editItem || !editContent.trim()) return;
    setError(null);
    const result = await updateSwotItem(editItem.id, { content: editContent.trim() });
    if (result.error) setError(result.error);
    else {
      setEditItem(null);
      setEditContent("");
      await onReload();
    }
  }

  async function handleAiQuadrantSubmit(type: SwotType, label: string) {
    setAiQuadrantError(null);
    setAiQuadrantLoading(true);
    try {
      const questions = QUADRANT_QUESTIONS[type];
      const contextParts = [`Quadrante: ${label}`];
      questions.forEach((q, i) => {
        const a = (aiQuadrantAnswers[i] ?? "").trim();
        if (a) contextParts.push(`${q.label}\n${a}`);
      });
      const context = contextParts.join("\n\n") || "Contexto geral do escritório.";
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "swot_quadrant", input: context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar sugestão.");
      const lines = (data.text ?? "").split("\n").filter((l: string) => l.trim());
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("-")) {
          const content = trimmed.replace(/^-\s*/, "").trim();
          if (content) await createSwotItem(type, content, "escritorio", planId);
        }
      }
      setAiQuadrant(null);
      setAiQuadrantAnswers([]);
      await onReload();
    } catch (err) {
      setAiQuadrantError(err instanceof Error ? err.message : "Erro ao gerar sugestão.");
    } finally {
      setAiQuadrantLoading(false);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const targetType = over.id as string;
    if (!SWOT_CONFIG.some((c) => c.key === targetType)) return;
    const item = swotItems.find((i) => i.id === active.id);
    if (!item || item.type === targetType) return;
    setError(null);
    const result = await updateSwotItem(item.id, { type: targetType as SwotType });
    if (result.error) setError(result.error);
    else await onReload();
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive text-center">{error}</div>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SWOT_CONFIG.map((config) => (
            <QuadrantCard
              key={config.key}
              config={config}
              items={getItemsByType(config.key)}
              addingType={addingType}
              newContent={newContent}
              setNewContent={setNewContent}
              setAddingType={setAddingType}
              onAdd={handleAdd}
              onEdit={openEdit}
              onDelete={handleDelete}
              onAiClick={() => setAiQuadrant(config.key)}
            />
          ))}
        </div>
      </DndContext>

      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) { setEditItem(null); setEditContent(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar item</DialogTitle>
            <DialogDescription>Altere o texto do item e salve.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Conteúdo do item..."
            className="min-h-[100px]"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); } }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditItem(null); setEditContent(""); }}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={!editContent.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={aiQuadrant !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAiQuadrant(null);
            setAiQuadrantAnswers([]);
            setAiQuadrantError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pedir ajuda à IA — {aiQuadrant != null ? SWOT_CONFIG.find((c) => c.key === aiQuadrant)?.label : ""}</DialogTitle>
            <DialogDescription>
              Responda às perguntas abaixo. A IA usará suas respostas para sugerir itens para este quadrante.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {aiQuadrant != null && QUADRANT_QUESTIONS[aiQuadrant].map((q, i) => (
              <div key={i}>
                <Label htmlFor={`ai-q-${i}`}>{q.label}</Label>
                <Textarea
                  id={`ai-q-${i}`}
                  value={aiQuadrantAnswers[i] ?? ""}
                  onChange={(e) => {
                    const next = [...aiQuadrantAnswers];
                    next[i] = e.target.value;
                    setAiQuadrantAnswers(next);
                  }}
                  placeholder={q.placeholder}
                  className="mt-1 min-h-[80px]"
                  disabled={aiQuadrantLoading}
                />
              </div>
            ))}
          </div>
          {aiQuadrantError && (
            <p className="text-sm text-destructive">{aiQuadrantError}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setAiQuadrant(null); setAiQuadrantAnswers([]); setAiQuadrantError(null); }}
              disabled={aiQuadrantLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => aiQuadrant && handleAiQuadrantSubmit(aiQuadrant, SWOT_CONFIG.find((c) => c.key === aiQuadrant)?.label ?? aiQuadrant)}
              disabled={aiQuadrantLoading}
              className="gap-2 bg-teal-600 hover:bg-teal-700"
            >
              {aiQuadrantLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Gerar sugestões
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
