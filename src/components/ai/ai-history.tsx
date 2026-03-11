"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AIHistoryProps {
  projectId: string;
}

interface Interaction {
  id: string;
  phase: string;
  provider: string;
  model: string;
  tokens_used: number | null;
  created_at: string;
  input_data: string | null;
  output_data: string | null;
}

export function AIHistory({ projectId }: AIHistoryProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Interaction | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("ai_interactions")
        .select("id, phase, provider, model, tokens_used, created_at, input_data, output_data")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error) {
        setInteractions((data ?? []) as Interaction[]);
      }
      setLoading(false);
    }
    load();
  }, [projectId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando histórico...
        </CardContent>
      </Card>
    );
  }

  const phaseLabels: Record<string, string> = {
    levantamento: "Levantamento",
    modelagem: "Modelagem",
    analise: "Análise",
    melhorias: "Melhorias",
    implantacao: "Implantação",
    encerramento: "Encerramento",
    swot: "SWOT",
    strategic_identity: "Identidade Estratégica",
    strategic_objectives: "Objetivos Estratégicos",
    tactical_plan: "Plano Tático",
    cadeia_valor: "Cadeia de Valor",
    plano_tatico: "Plano Tático",
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <CardTitle>Histórico de IA</CardTitle>
          </div>
          <CardDescription>
            Interações com IA para este projeto. Clique em uma linha para ver entrada e saída.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {interactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">
              Nenhuma interação com IA registrada para este projeto.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fase</TableHead>
                  <TableHead>Provedor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interactions.map((i) => (
                  <TableRow
                    key={i.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelected(i)}
                  >
                    <TableCell>
                      <Badge variant="secondary">
                        {phaseLabels[i.phase] ?? i.phase}
                      </Badge>
                    </TableCell>
                    <TableCell>{i.provider}</TableCell>
                    <TableCell>
                      {new Date(i.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>{i.tokens_used ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selected && (
                <>
                  {phaseLabels[selected.phase] ?? selected.phase} — {selected.provider}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Entrada</h4>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40 whitespace-pre-wrap">
                  {selected.input_data || "—"}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Saída</h4>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-60 whitespace-pre-wrap">
                  {selected.output_data || "—"}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
