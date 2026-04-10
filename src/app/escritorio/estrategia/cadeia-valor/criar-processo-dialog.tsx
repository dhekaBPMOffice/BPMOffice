"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";
import { saveValueChainOfficeProcess } from "@/app/escritorio/processos/value-chain-actions";
import type { ValueChainProcessPayload } from "@/lib/value-chain-mappers";
import { BPM_STAGES, type StageStatus } from "@/types/cadeia-valor";
import { compactLevelsForPersist } from "@/lib/office-process-levels";

const TIPO_OPTIONS = ["Primário", "Gerencial", "Apoio"] as const;

const DEFAULT_ETAPAS = Object.fromEntries(
  BPM_STAGES.map((s) => [s, "Não iniciado" as StageStatus])
) as Record<(typeof BPM_STAGES)[number], StageStatus>;

export function CriarProcessoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [macroprocesso, setMacroprocesso] = useState("");
  const [tipo, setTipo] = useState<string>("Primário");
  const [niveis, setNiveis] = useState<string[]>([""]);
  const [description, setDescription] = useState("");

  function resetForm() {
    setMacroprocesso("");
    setTipo("Primário");
    setNiveis([""]);
    setDescription("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const levels = compactLevelsForPersist(niveis.length ? niveis : [""]);
    const macroTrim = macroprocesso.trim();
    if (!macroTrim && !levels[0]) {
      setError("Preencha o macroprocesso e/ou o nível 1.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: ValueChainProcessPayload = {
      tipo,
      macroprocesso: macroTrim,
      niveis: levels,
      description: description.trim() || null,
      gestorProcesso: "",
      prioridade: "Média",
      statusGeral: "Não iniciado",
      etapas: { ...DEFAULT_ETAPAS },
    };

    try {
      const result = await saveValueChainOfficeProcess(payload);
      if ("error" in result && result.error) {
        setError(result.error);
        setSaving(false);
        return;
      }

      resetForm();
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar processo.");
    } finally {
      setSaving(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  function updateNivel(index: number, value: string) {
    setNiveis((prev) => prev.map((x, i) => (i === index ? value : x)));
  }

  function addNivel() {
    setNiveis((prev) => [...prev, ""]);
  }

  function removeNivel(index: number) {
    setNiveis((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : [""]
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar processo manualmente</DialogTitle>
          <DialogDescription>
            Insira as informações do processo. Ele será adicionado à cadeia de
            valor do escritório.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cp-macro">Macroprocesso</Label>
            <Input
              id="cp-macro"
              value={macroprocesso}
              onChange={(e) => setMacroprocesso(e.target.value)}
              placeholder="Ex.: Gestão Administrativa"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-tipo">Tipo</Label>
            <Select
              id="cp-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              {TIPO_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Níveis</p>
            {niveis.map((nv, idx) => (
              <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor={`cp-nivel-${idx}`}>Nível {idx + 1}</Label>
                  <Input
                    id={`cp-nivel-${idx}`}
                    value={nv}
                    onChange={(e) => updateNivel(idx, e.target.value)}
                    placeholder={idx === 0 ? "Ex.: primeira subdivisão" : "Subdivisão"}
                  />
                </div>
                {idx > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => removeNivel(idx)}
                  >
                    Remover
                  </Button>
                ) : null}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addNivel}>
              <Plus className="h-4 w-4" aria-hidden />
              Adicionar nível
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-desc">Descrição</Label>
            <Textarea
              id="cp-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objetivo e escopo (opcional)."
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar processo
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
