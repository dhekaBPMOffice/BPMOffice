"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { saveValueChainOfficeProcess } from "@/app/escritorio/processos/value-chain-actions";
import type { ValueChainProcessPayload } from "@/lib/value-chain-mappers";
import { BPM_STAGES, type StageStatus } from "@/types/cadeia-valor";

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

  const [nome, setNome] = useState("");
  const [macroprocesso, setMacroprocesso] = useState("");
  const [tipo, setTipo] = useState<string>("Primário");
  const [nivel1, setNivel1] = useState("");
  const [nivel2, setNivel2] = useState("");
  const [nivel3, setNivel3] = useState("");

  function resetForm() {
    setNome("");
    setMacroprocesso("");
    setTipo("Primário");
    setNivel1("");
    setNivel2("");
    setNivel3("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = nome.trim();
    if (!trimmedName) {
      setError("O nome do processo é obrigatório.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: ValueChainProcessPayload = {
      tipo,
      macroprocesso: macroprocesso.trim() || trimmedName,
      nivel1: nivel1.trim(),
      nivel2: nivel2.trim(),
      nivel3: nivel3.trim(),
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
            <Label htmlFor="cp-nome">Nome do processo *</Label>
            <Input
              id="cp-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Gestão de contratos"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-macro">Macroprocesso</Label>
            <Input
              id="cp-macro"
              value={macroprocesso}
              onChange={(e) => setMacroprocesso(e.target.value)}
              placeholder="Ex.: Gestão Administrativa"
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

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="cp-n1">Nível 1</Label>
              <Input
                id="cp-n1"
                value={nivel1}
                onChange={(e) => setNivel1(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-n2">Nível 2</Label>
              <Input
                id="cp-n2"
                value={nivel2}
                onChange={(e) => setNivel2(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-n3">Nível 3</Label>
              <Input
                id="cp-n3"
                value={nivel3}
                onChange={(e) => setNivel3(e.target.value)}
              />
            </div>
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
