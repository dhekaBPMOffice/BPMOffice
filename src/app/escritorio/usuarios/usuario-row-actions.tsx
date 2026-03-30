"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { updateUser, deleteUser } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface UsuarioParaEdicao {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  job_title: string | null;
  custom_role_id: string | null;
  role: string;
}

interface CustomRole {
  id: string;
  name: string;
}

interface UsuarioRowActionsProps {
  usuario: UsuarioParaEdicao;
  customRoles: CustomRole[];
  currentUserId: string;
  activeLeaderCount: number;
}

export function UsuarioRowActions({
  usuario,
  customRoles,
  currentUserId,
  activeLeaderCount,
}: UsuarioRowActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete =
    usuario.id !== currentUserId &&
    (usuario.role !== "leader" || activeLeaderCount > 1);

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await updateUser(usuario.id, {
      full_name: formData.get("full_name") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || null,
      department: (formData.get("department") as string) || null,
      job_title: (formData.get("job_title") as string) || null,
      custom_role_id: formData.get("custom_role_id")
        ? (formData.get("custom_role_id") as string)
        : null,
    });
    setLoading(false);
    if (result.success) {
      setEditOpen(false);
      router.refresh();
    } else {
      setError(result.error ?? "Erro ao atualizar.");
    }
  }

  async function handleDelete() {
    setError(null);
    setLoading(true);
    const result = await deleteUser(usuario.id);
    setLoading(false);
    if (result.success) {
      setDeleteOpen(false);
      router.refresh();
    } else {
      setError(result.error ?? "Erro ao excluir.");
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => {
            setError(null);
            setEditOpen(true);
          }}
          aria-label="Editar usuário"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        {canDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => {
              setError(null);
              setDeleteOpen(true);
            }}
            aria-label="Excluir usuário"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent onClose={() => setEditOpen(false)}>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>
              Altere os dados do usuário. O perfil só pode ser alterado por perfis customizados.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-full_name">Nome completo</Label>
                <Input
                  id="edit-full_name"
                  name="full_name"
                  defaultValue={usuario.full_name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">E-mail</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  defaultValue={usuario.email}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input
                  id="edit-phone"
                  name="phone"
                  type="tel"
                  defaultValue={usuario.phone ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-department">Departamento</Label>
                <Input
                  id="edit-department"
                  name="department"
                  defaultValue={usuario.department ?? ""}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-job_title">Cargo</Label>
                <Input
                  id="edit-job_title"
                  name="job_title"
                  defaultValue={usuario.job_title ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-custom_role_id">Perfil customizado</Label>
                <Select
                  id="edit-custom_role_id"
                  name="custom_role_id"
                  defaultValue={usuario.custom_role_id ?? ""}
                >
                  <option value="">Nenhum (usuário padrão)</option>
                  {customRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
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

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent onClose={() => setDeleteOpen(false)}>
          <DialogHeader>
            <DialogTitle>Excluir usuário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{usuario.full_name}</strong>? Esta ação não pode ser desfeita e o usuário perderá acesso ao sistema.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
