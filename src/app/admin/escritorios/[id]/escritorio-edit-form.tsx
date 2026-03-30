"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateOffice } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

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
  };
  plans: { id: string; name: string }[];
}

export function EscritorioEditForm({ office, plans }: EscritorioEditFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(office.name);
  const [slug, setSlug] = useState(office.slug);

  const derivedSlug = generateSlug(name);

  useEffect(() => {
    setName(office.name);
    setSlug(office.slug);
  }, [office.name, office.slug, office.plan_id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("slug", slug || derivedSlug);

    const result = await updateOffice(office.id, formData);

    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.refresh();
  }

  return (
    <>
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

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
          <Select id="edit-plan_id" name="plan_id" defaultValue={office.plan_id ?? ""} key={office.plan_id ?? "none"}>
            <option value="">Sem plano</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </>
  );
}
