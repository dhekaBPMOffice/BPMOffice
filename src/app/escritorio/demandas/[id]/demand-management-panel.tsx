"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDemand } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ProfileOption = {
  id: string;
  full_name: string;
  email: string;
};

type DemandManagementPanelProps = {
  demandId: string;
  status: string;
  assignedTo: string | null;
  internalObservation: string | null;
  profiles: ProfileOption[];
};

export function DemandManagementPanel({
  demandId,
  status,
  assignedTo,
  internalObservation,
  profiles,
}: DemandManagementPanelProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentAssignedTo, setCurrentAssignedTo] = useState(assignedTo ?? "");
  const [observation, setObservation] = useState(internalObservation ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateDemand(demandId, {
      status: currentStatus,
      assigned_to: currentAssignedTo || null,
      internal_observation: observation.trim() || null,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestão interna</CardTitle>
        <CardDescription>
          Atualize responsável, status e observações visíveis apenas para o escritório.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={currentStatus} onChange={(event) => setCurrentStatus(event.target.value)}>
              <option value="active">Ativa</option>
              <option value="paused">Pausada</option>
              <option value="completed">Concluída</option>
              <option value="cancelled">Cancelada</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Select
              value={currentAssignedTo}
              onChange={(event) => setCurrentAssignedTo(event.target.value)}
            >
              <option value="">Sem responsável</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name || profile.email}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Observação</Label>
          <Textarea
            rows={4}
            value={observation}
            onChange={(event) => setObservation(event.target.value)}
            placeholder="Registre observações internas sobre triagem, próximos passos ou retorno ao solicitante."
          />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar gestão"}
        </Button>
      </CardContent>
    </Card>
  );
}
