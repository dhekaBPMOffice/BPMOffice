"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateOffice, deleteOffice } from "../actions";
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
import { Select } from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface EscritorioEditFormProps {
  office: {
    id: string;
    name: string;
    slug: string;
    plan_id: string | null;
    is_active: boolean;
  };
  plans: { id: string; name: string }[];
}

export function EscritorioEditForm({ office, plans }: EscritorioEditFormProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(office.name);
  const [slug, setSlug] = useState(office.slug);

  const derivedSlug = generateSlug(name);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("slug", slug || derivedSlug);
    formData.set(
      "is_active",
      (form.elements.namedItem("is_active") as HTMLInputElement)?.checked
        ? "true"
        : "false"
    );

    const result = await updateOffice(office.id, formData);

    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    setEditing(false);
    setSubmitting(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este escritório? Esta ação não pode ser desfeita.")) {
      return;
    }
    setError(null);
    setDeleting(true);

    const result = await deleteOffice(office.id);

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
        <CardTitle>Editar Escritório</CardTitle>
        <CardDescription>
          Altere os dados do escritório ou exclua-o da plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-4">
            {error}
          </div>
        )}

        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                name="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={derivedSlug}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-plan_id">Plano</Label>
              <Select id="edit-plan_id" name="plan_id" defaultValue={office.plan_id ?? ""}>
                <option value="">Sem plano</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-is_active"
                name="is_active"
                value="true"
                defaultChecked={office.is_active}
                className="rounded border-input"
              />
              <Label htmlFor="edit-is_active">Escritório ativo</Label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setName(office.name);
                  setSlug(office.slug);
                  setError(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex gap-2">
            <Button onClick={() => setEditing(true)} variant="default">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Excluindo..." : "Excluir Escritório"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
