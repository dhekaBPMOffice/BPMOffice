"use client";

import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { createClient } from "@/lib/supabase/client";
import {
  createRole,
  updateRole,
  deleteRole,
  setRolePermission,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Shield, Trash2 } from "lucide-react";
import type { CustomRole, RolePermission } from "@/types/database";

const RESOURCES = [
  "demandas",
  "conhecimento",
  "capacitacao",
  "processos",
  "estrategia",
  "usuarios",
];

export default function PerfisPage() {
  const [roles, setRoles] = useState<(CustomRole & { role_permissions: RolePermission[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  async function loadRoles() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("office_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!profile?.office_id) return;

    const { data } = await supabase
      .from("custom_roles")
      .select(`
        *,
        role_permissions (*)
      `)
      .eq("office_id", profile.office_id)
      .order("name");

    setRoles((data as (CustomRole & { role_permissions: RolePermission[] })[]) ?? []);
  }

  useEffect(() => {
    loadRoles().finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditingRole(null);
    setFormName("");
    setFormDescription("");
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(role: CustomRole) {
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description ?? "");
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const result = editingRole
      ? await updateRole(editingRole.id, formName, formDescription || undefined)
      : await createRole(formName, formDescription || undefined);

    setSubmitting(false);

    if (result.success) {
      setDialogOpen(false);
      loadRoles();
    } else {
      setFormError(result.error ?? "Erro ao salvar.");
    }
  }

  async function handleDelete(roleId: string) {
    if (!confirm("Excluir este perfil? Usuários com este perfil ficarão sem perfil customizado.")) return;

    const result = await deleteRole(roleId);
    if (result.success) loadRoles();
  }

  async function handlePermissionChange(
    roleId: string,
    resource: string,
    field: "can_view" | "can_create" | "can_edit" | "can_delete",
    value: boolean
  ) {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;

    const perm = role.role_permissions?.find((p) => p.resource === resource) ?? {
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
    };

    const permissions = {
      can_view: field === "can_view" ? value : perm.can_view,
      can_create: field === "can_create" ? value : perm.can_create,
      can_edit: field === "can_edit" ? value : perm.can_edit,
      can_delete: field === "can_delete" ? value : perm.can_delete,
    };

    await setRolePermission(roleId, resource, permissions);
    loadRoles();
  }

  if (loading) {
    return (
      <PageLayout title="Perfis Customizados" description="Carregando..." icon={Shield}>
        <span />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Perfis Customizados"
      description="Crie e gerencie perfis com permissões específicas por recurso."
      icon={Shield}
      actions={
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo Perfil
        </Button>
      }
    >
      <div className="space-y-6">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>{role.name}</CardTitle>
                <CardDescription>{role.description ?? "Sem descrição"}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => openEdit(role)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="icon" onClick={() => handleDelete(role.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Visualizar</TableHead>
                    <TableHead>Criar</TableHead>
                    <TableHead>Editar</TableHead>
                    <TableHead>Excluir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RESOURCES.map((resource) => {
                    const perm = role.role_permissions?.find((p) => p.resource === resource);
                    return (
                      <TableRow key={resource}>
                        <TableCell className="font-medium capitalize">{resource}</TableCell>
                        <TableCell>
                          <Switch
                            checked={perm?.can_view ?? false}
                            onCheckedChange={(v) =>
                              handlePermissionChange(role.id, resource, "can_view", v)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={perm?.can_create ?? false}
                            onCheckedChange={(v) =>
                              handlePermissionChange(role.id, resource, "can_create", v)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={perm?.can_edit ?? false}
                            onCheckedChange={(v) =>
                              handlePermissionChange(role.id, resource, "can_edit", v)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={perm?.can_delete ?? false}
                            onCheckedChange={(v) =>
                              handlePermissionChange(role.id, resource, "can_delete", v)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}

        {roles.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum perfil customizado. Clique em &quot;Novo Perfil&quot; para criar.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? "Editar perfil" : "Novo perfil"}</DialogTitle>
            <DialogDescription>
              Defina o nome e a descrição do perfil. As permissões podem ser ajustadas após a criação.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {formError}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                placeholder="Ex: Analista Sênior"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Breve descrição do perfil"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando..." : editingRole ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
