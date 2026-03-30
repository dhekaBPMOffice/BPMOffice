"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Type,
  Table2,
  ListTree,
  FileText,
} from "lucide-react";
import type { DocumentSectionConfig, DocumentSectionType } from "@/types/database";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

const TYPE_META: Record<
  DocumentSectionType,
  { label: string; icon: typeof Type; removable: boolean }
> = {
  title: { label: "Título", icon: Type, removable: false },
  rich_text: { label: "Texto rico", icon: FileText, removable: true },
  data_table: { label: "Tabela de dados", icon: Table2, removable: false },
  data_list: { label: "Lista de dados", icon: ListTree, removable: false },
};

interface SectionEditorProps {
  sections: DocumentSectionConfig[];
  onChange: (sections: DocumentSectionConfig[]) => void;
}

function SectionItem({
  section,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  section: DocumentSectionConfig;
  index: number;
  total: number;
  onUpdate: (index: number, s: DocumentSectionConfig) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}) {
  const meta = TYPE_META[section.type] ?? TYPE_META.rich_text;
  const Icon = meta.icon;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex flex-col gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            disabled={index === 0}
            onClick={() => onMoveUp(index)}
            title="Mover para cima"
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            disabled={index === total - 1}
            onClick={() => onMoveDown(index)}
            title="Mover para baixo"
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
        </div>
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium flex-1">{section.label}</span>
        <Badge variant="outline" className="text-[10px]">
          {meta.label}
        </Badge>
        {meta.removable && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onRemove(index)}
            title="Remover bloco"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
        {(section.type === "title" || section.type === "rich_text") && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Recolher" : "Editar"}
          </Button>
        )}
      </div>

      {expanded && section.type === "title" && (
        <div className="border-t px-3 py-3 space-y-2">
          <Label className="text-xs text-muted-foreground">Texto padrão do título</Label>
          <Input
            value={section.defaultText ?? ""}
            onChange={(e) =>
              onUpdate(index, { ...section, defaultText: e.target.value })
            }
            className="h-8 text-sm"
          />
        </div>
      )}

      {expanded && section.type === "rich_text" && (
        <div className="border-t px-3 py-3 space-y-2">
          <Label className="text-xs text-muted-foreground">Conteúdo</Label>
          <RichTextEditor
            value={section.content ?? ""}
            onChange={(html) =>
              onUpdate(index, { ...section, content: html })
            }
            minHeight="80px"
          />
        </div>
      )}
    </div>
  );
}

export function SectionEditor({ sections, onChange }: SectionEditorProps) {
  function handleUpdate(index: number, updated: DocumentSectionConfig) {
    const next = [...sections];
    next[index] = updated;
    onChange(next);
  }

  function handleRemove(index: number) {
    onChange(sections.filter((_, i) => i !== index));
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const next = [...sections];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index: number) {
    if (index >= sections.length - 1) return;
    const next = [...sections];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  function addRichTextBlock() {
    const key = `rich_text_${Date.now()}`;
    onChange([
      ...sections,
      { type: "rich_text", key, label: "Bloco de texto", content: "" },
    ]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Seções do documento</p>
        <Button type="button" variant="outline" size="sm" onClick={addRichTextBlock}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Bloco de texto
        </Button>
      </div>
      <div className="space-y-2">
        {sections.map((section, idx) => (
          <SectionItem
            key={section.key}
            section={section}
            index={idx}
            total={sections.length}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
          />
        ))}
        {sections.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma seção configurada.
          </p>
        )}
      </div>
    </div>
  );
}
