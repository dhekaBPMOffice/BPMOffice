"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateLeader } from "@/app/admin/escritorios/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export type LeaderData = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
};

interface EditarLiderFormProps {
  officeId: string;
  leader: LeaderData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarLiderForm({
  officeId,
  leader,
  open,
  onOpenChange,
}: EditarLiderFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const result = await updateLeader(leader.id, officeId, {
      full_name: formData.get("full_name") as string,
      email: formData.get("email") as string,
    });

    setLoading(false);

    if (result.success) {
      router.refresh();
      onOpenChange(false);
    } else {
      setError(result.error ?? "Erro ao atualizar líder.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar líder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit_full_name">Nome completo</Label>
            <Input
              id="edit_full_name"
              name="full_name"
              required
              defaultValue={leader.full_name}
              placeholder="Ex: Maria Silva"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_email">E-mail</Label>
            <Input
              id="edit_email"
              name="email"
              type="email"
              required
              defaultValue={leader.email}
              placeholder="maria@escritorio.com"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
