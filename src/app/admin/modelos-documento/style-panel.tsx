"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { DocumentTemplateStyles, DocumentStyleRole, TextAlignment } from "@/types/database";
import { FONT_OPTIONS } from "./lib";

interface StylePanelProps {
  styles: DocumentTemplateStyles;
  onChange: (styles: DocumentTemplateStyles) => void;
}

function NumericField({
  label,
  value,
  onChange,
  unit,
  min = 1,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">
        {label} {unit && <span className="opacity-60">({unit})</span>}
      </Label>
      <Input
        type="number"
        min={min}
        max={max}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || min)}
        className="h-8 text-sm"
      />
    </div>
  );
}

function AlignmentSelector({
  value,
  onChange,
}: {
  value: TextAlignment;
  onChange: (v: TextAlignment) => void;
}) {
  const opts: { v: TextAlignment; icon: typeof AlignLeft; label: string }[] = [
    { v: "left", icon: AlignLeft, label: "Esquerda" },
    { v: "center", icon: AlignCenter, label: "Centro" },
    { v: "right", icon: AlignRight, label: "Direita" },
  ];
  return (
    <div className="flex gap-1">
      {opts.map(({ v, icon: Icon, label }) => (
        <Button
          key={v}
          type="button"
          variant={value === v ? "default" : "outline"}
          size="icon"
          className="h-8 w-8"
          onClick={() => onChange(v)}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      ))}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="icon"
      className="h-8 w-8"
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}

function RoleSection({
  label,
  role,
  onChange,
}: {
  label: string;
  role: DocumentStyleRole;
  onChange: (r: DocumentStyleRole) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 text-sm font-medium text-foreground"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {label}
        <span className="ml-auto text-xs text-muted-foreground">{role.fontSize}pt</span>
      </button>
      {open && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <NumericField label="Tamanho" value={role.fontSize} onChange={(v) => onChange({ ...role, fontSize: v })} unit="pt" min={6} max={72} />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Formatação</Label>
              <div className="flex gap-1 pt-0.5">
                <ToggleButton active={role.bold} onClick={() => onChange({ ...role, bold: !role.bold })} title="Negrito">
                  <Bold className="h-3.5 w-3.5" />
                </ToggleButton>
                <ToggleButton active={role.italic} onClick={() => onChange({ ...role, italic: !role.italic })} title="Itálico">
                  <Italic className="h-3.5 w-3.5" />
                </ToggleButton>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Alinhamento</Label>
            <AlignmentSelector value={role.alignment} onChange={(v) => onChange({ ...role, alignment: v })} />
          </div>
        </div>
      )}
    </div>
  );
}

export function StylePanel({ styles, onChange }: StylePanelProps) {
  function setRole(key: "title" | "subtitle" | "body" | "tableHeader", role: DocumentStyleRole) {
    onChange({ ...styles, [key]: role });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Família da fonte</Label>
        <Select
          value={styles.fontFamily}
          onChange={(e) => onChange({ ...styles, fontFamily: e.target.value })}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </Select>
      </div>

      <RoleSection label="Título" role={styles.title} onChange={(r) => setRole("title", r)} />
      <RoleSection label="Subtítulo" role={styles.subtitle} onChange={(r) => setRole("subtitle", r)} />
      <RoleSection label="Corpo" role={styles.body} onChange={(r) => setRole("body", r)} />
      <RoleSection label="Cabeçalho de tabela" role={styles.tableHeader} onChange={(r) => setRole("tableHeader", r)} />

      <div className="rounded-lg border p-3 space-y-3">
        <p className="text-sm font-medium">Espaçamento <span className="text-xs text-muted-foreground font-normal">(pt)</span></p>
        <div className="grid grid-cols-2 gap-3">
          <NumericField label="Após título" value={styles.spacing.afterTitle} onChange={(v) => onChange({ ...styles, spacing: { ...styles.spacing, afterTitle: v } })} min={0} max={60} />
          <NumericField label="Antes de seção" value={styles.spacing.beforeSection} onChange={(v) => onChange({ ...styles, spacing: { ...styles.spacing, beforeSection: v } })} min={0} max={60} />
          <NumericField label="Após subtítulo" value={styles.spacing.afterSectionTitle} onChange={(v) => onChange({ ...styles, spacing: { ...styles.spacing, afterSectionTitle: v } })} min={0} max={60} />
          <NumericField label="Entre parágrafos" value={styles.spacing.bodyParagraph} onChange={(v) => onChange({ ...styles, spacing: { ...styles.spacing, bodyParagraph: v } })} min={0} max={60} />
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-3">
        <p className="text-sm font-medium">Margens <span className="text-xs text-muted-foreground font-normal">(mm)</span></p>
        <div className="grid grid-cols-2 gap-3">
          <NumericField label="Superior" value={styles.margins.top} onChange={(v) => onChange({ ...styles, margins: { ...styles.margins, top: v } })} min={5} max={50} />
          <NumericField label="Inferior" value={styles.margins.bottom} onChange={(v) => onChange({ ...styles, margins: { ...styles.margins, bottom: v } })} min={5} max={50} />
          <NumericField label="Esquerda" value={styles.margins.left} onChange={(v) => onChange({ ...styles, margins: { ...styles.margins, left: v } })} min={5} max={50} />
          <NumericField label="Direita" value={styles.margins.right} onChange={(v) => onChange({ ...styles, margins: { ...styles.margins, right: v } })} min={5} max={50} />
        </div>
      </div>
    </div>
  );
}
