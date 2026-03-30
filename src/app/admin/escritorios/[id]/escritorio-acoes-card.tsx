"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteOffice, setOfficeActive } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trash2 } from "lucide-react";

interface EscritorioAcoesCardProps {
  officeId: string;
  isActive: boolean;
}

export function EscritorioAcoesCard({ officeId, isActive }: EscritorioAcoesCardProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleToggleActive() {
    setError(null);
    setToggling(true);
    const result = await setOfficeActive(officeId, !isActive);
    if (result?.error) {
      setError(result.error);
      setToggling(false);
      return;
    }
    setToggling(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este escritório? Esta ação não pode ser desfeita.")) {
      return;
    }
    setError(null);
    setDeleting(true);

    const result = await deleteOffice(officeId);

    if (result?.error) {
      setError(result.error);
      setDeleting(false);
      return;
    }

    router.push("/admin/escritorios");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status e exclusão</CardTitle>
        <CardDescription>
          Ative ou inative o escritório na plataforma, ou remova-o permanentemente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant={isActive ? "outline" : "default"}
            onClick={handleToggleActive}
            disabled={toggling || deleting}
          >
            {toggling
              ? "Aplicando..."
              : isActive
                ? "Inativar escritório"
                : "Ativar escritório"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="gap-2"
            onClick={handleDelete}
            disabled={deleting || toggling}
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "Excluindo..." : "Excluir escritório"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
