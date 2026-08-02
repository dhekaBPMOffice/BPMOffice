"use client";

import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { createClient } from "@/lib/supabase/client";
import {
  createRole,
  updateRole,
  deleteRole,
  setRolePermission,
  bootstrapOfficeRoles,
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
import { Badge } from "@/components/ui/badge";
import { Eye, Plus, Pencil, Trash2 } from "lucide-react";
import type { CustomRole, RolePermission } from "@/types/database";
import {
  isSystemDefaultRole,
  SYSTEM_DEFAULT_ROLE_DESCRIPTION,
} from "@/lib/custom-roles/default-office-role";

const RESOURCES = [
  "demandas",
  "conhecimento",
  "capacitacao",
  "processos",
  "estrategia",
  "usuarios",
] as const;

type RoleWithPermissions = CustomRole & { role_permissions: RolePermission[] };

function PermissionsTable({
  role,
  readOnly,
  onPermissionChange,
}: {
  role: RoleWithPermissions;
  readOnly: boolean;
  onPermissionChange?: (
    resource: string,
    field: "can_view" | "can_create" | "can_edit" | "can_delete",
    value: boolean
  ) => void;
}) {
  return (
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
              {(["can_view", "can_create", "can_edit", "can_delete"] as const).map((field) => (
                <TableCell key={field}>
                  <Switch
                    checked={perm?.[field] ?? false}
                    disabled={readOnly}
                    onCheckedChange={(v) => onPermissionChange?.(resource, field, v)}
                  />
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function PerfisPage() {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailRole, setDetailRole] = useState<RoleWithPermissions | null>(null);
  const [detailReadOnly, setDetailReadOnly] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  async function loadRoles() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("office_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!profile?.office_id) return;

    const { data } = await supabase
      .from("custom_roles")
      .select(
        `
        *,
        role_permissions (*)
      `
      )
      .eq("office_id", profile.office_id)
      .order("is_system_default", { ascending: false })
      .order("name");

    setRoles((data as RoleWithPermissions[]) ?? []);
  }

  useEffect(() => {
    bootstrapOfficeRoles()
      .then(() => loadRoles())
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setFormName("");
    setFormDescription("");
    setFormError(null);
    setCreateDialogOpen(true);
  }

  function openView(role: RoleWithPermissions) {
    setDetailRole(role);
    setDetailReadOnly(true);
    setFormName(role.name);
    setFormDescription(role.description ?? "");
    setFormError(null);
  }

  function openEdit(role: RoleWithPermissions) {
    if (isSystemDefaultRole(role)) {
      openView(role);
      return;
    }
    setDetailRole(role);
    setDetailReadOnly(false);
    setFormName(role.name);
    setFormDescription(role.description ?? "");
    setFormError(null);
  }

  function closeDetail() {
    setDetailRole(null);
    setFormError(null);
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const result = await createRole(formName, formDescription || undefined);

    setSubmitting(false);

    if (result.success && result.id) {
      setCreateDialogOpen(false);
      const { data } = await supabase
        .from("custom_roles")
        .select(`*, role_permissions (*)`)
        .eq("id", result.id)
        .single();
      await loadRoles();
      if (data) openEdit(data as RoleWithPermissions);
    } else if (result.success) {
      setCreateDialogOpen(false);
      loadRoles();
    } else {
      setFormError(result.error ?? "Erro ao salvar.");
    }
  }

  async function handleDetailMetaSave() {
    if (!detailRole || detailReadOnly) return;
    setFormError(null);
    setSubmitting(true);

    const result = await updateRole(detailRole.id, formName, formDescription || undefined);

    setSubmitting(false);

    if (result.success) {
      await loadRoles();
      setDetailRole((prev) =>
        prev ? { ...prev, name: formName, description: formDescription || null } : null
      );
    } else {
      setFormError(result.error ?? "Erro ao salvar.");
    }
  }

  async function handleDeleteFromDetail() {
    if (!detailRole || isSystemDefaultRole(detailRole)) return;
    if (
      !confirm(
        "Excluir este perfil? Usuários com este perfil passarão a usar o perfil padrão do sistema."
      )
    ) {
      return;
    }

    const result = await deleteRole(detailRole.id);
    if (result.success) {
      closeDetail();
      loadRoles();
    } else {
      setFormError(result.error ?? "Erro ao excluir.");
    }
  }

  async function handlePermissionChange(
    resource: string,
    field: "can_view" | "can_create" | "can_edit" | "can_delete",
    value: boolean
  ) {
    if (!detailRole || detailReadOnly) return;

    const perm = detailRole.role_permissions?.find((p) => p.resource === resource) ?? {
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

    const result = await setRolePermission(detailRole.id, resource, permissions);
    if (result.success) {
      await loadRoles();
      setDetailRole((prev) => {
        if (!prev) return null;
        const nextPerms = [...(prev.role_permissions ?? [])];
        const idx = nextPerms.findIndex((p) => p.resource === resource);
        if (idx >= 0) {
          nextPerms[idx] = { ...nextPerms[idx], ...permissions };
        } else {
          nextPerms.push({
            id: "",
            role_id: prev.id,
            resource,
            ...permissions,
          });
        }
        return { ...prev, role_permissions: nextPerms };
      });
    }
  }

  if (loading) {
    return (
      <PageLayout title="Perfis de acesso" description="Carregando..." iconName="Shield">
        <span />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Perfis de acesso"
      description="O perfil padrão do sistema é aplicado automaticamente. Crie perfis customizados para regras específicas."
      iconName="Shield"
      actions={
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo Perfil
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Perfis do escritório</CardTitle>
          <CardDescription>
            Clique no lápis para editar um perfil customizado ou no olho para ver o perfil padrão
            do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Preparando perfil padrão do sistema…
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Descrição</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => {
                  const systemRole = isSystemDefaultRole(role);
                  const description =
                    role.description ??
                    (systemRole ? SYSTEM_DEFAULT_ROLE_DESCRIPTION : "Sem descrição");
                  return (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{role.name}</span>
                          {systemRole && (
                            <Badge variant="secondary" className="text-xs">
                              Sistema
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden max-w-md truncate text-muted-foreground md:table-cell">
                        {description}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {systemRole ? (
                            <Button
                              variant="outline"
                              size="icon"
                              aria-label={`Visualizar ${role.name}`}
                              onClick={() => openView(role)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                aria-label={`Editar ${role.name}`}
                                onClick={() => openEdit(role)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                aria-label={`Excluir ${role.name}`}
                                onClick={async () => {
                                  if (
                                    !confirm(
                                      "Excluir este perfil? Usuários com este perfil passarão a usar o perfil padrão do sistema."
                                    )
                                  ) {
                                    return;
                                  }
                                  const result = await deleteRole(role.id);
                                  if (result.success) loadRoles();
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo perfil</DialogTitle>
            <DialogDescription>
              Defina nome e descrição. Em seguida você poderá ajustar as permissões por recurso.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {formError && (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{formError}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="create-name" required>
                Nome
              </Label>
              <Input
                id="create-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                placeholder="Ex: Analista Sênior"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Descrição</Label>
              <Input
                id="create-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Breve descrição do perfil"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Criando..." : "Criar e configurar permissões"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailRole !== null} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detailReadOnly ? "Visualizar perfil" : "Editar perfil"}
              {detailRole && isSystemDefaultRole(detailRole) && (
                <Badge variant="secondary" className="ml-2 align-middle text-xs">
                  Sistema · não editável
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {detailReadOnly
                ? "Permissões definidas pelo sistema para colaboradores com acesso padrão."
                : "Altere nome, descrição e permissões por recurso."}
            </DialogDescription>
          </DialogHeader>

          {detailRole && (
            <div className="space-y-6 py-2">
              {formError && (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{formError}</p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="detail-name">Nome</Label>
                  <Input
                    id="detail-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    disabled={detailReadOnly}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="detail-description">Descrição</Label>
                  <Input
                    id="detail-description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    disabled={detailReadOnly}
                  />
                </div>
              </div>

              {!detailReadOnly && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={submitting}
                    onClick={() => void handleDetailMetaSave()}
                  >
                    {submitting ? "Salvando..." : "Salvar nome e descrição"}
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Permissões por recurso</p>
                <PermissionsTable
                  role={detailRole}
                  readOnly={detailReadOnly}
                  onPermissionChange={handlePermissionChange}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {detailRole && !detailReadOnly && (
              <Button
                type="button"
                variant="destructive"
                className="mr-auto"
                onClick={() => void handleDeleteFromDetail()}
              >
                Excluir perfil
              </Button>
            )}
            <Button type="button" variant="outline" onClick={closeDetail}>
              {detailReadOnly ? "Fechar" : "Concluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
