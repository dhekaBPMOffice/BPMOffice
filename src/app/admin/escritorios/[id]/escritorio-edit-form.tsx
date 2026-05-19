"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateOffice } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SYSTEM_AREAS, resolveAreaAccess } from "@/lib/system-areas";

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
    area_overrides: Record<string, boolean>;
  };
  plans: { id: string; name: string; features: Record<string, boolean> | null }[];
}

export function EscritorioEditForm({ office, plans }: EscritorioEditFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(office.name);
  const [slug, setSlug] = useState(office.slug);
  const [planId, setPlanId] = useState(office.plan_id ?? "");
  const [areaOverrides, setAreaOverrides] = useState<Record<string, "inherit" | "allow" | "block">>(() =>
    Object.fromEntries(
      SYSTEM_AREAS.map((area) => {
        const value = office.area_overrides?.[area.key];
        return [area.key, value === true ? "allow" : value === false ? "block" : "inherit"];
      })
    )
  );

  const derivedSlug = generateSlug(name);
  const selectedPlan = plans.find((plan) => plan.id === planId) ?? null;
  const inheritedAreas = resolveAreaAccess(selectedPlan?.features ?? null, {});

  useEffect(() => {
    setName(office.name);
    setSlug(office.slug);
    setPlanId(office.plan_id ?? "");
    setAreaOverrides(
      Object.fromEntries(
        SYSTEM_AREAS.map((area) => {
          const value = office.area_overrides?.[area.key];
          return [area.key, value === true ? "allow" : value === false ? "block" : "inherit"];
        })
      )
    );
  }, [office.name, office.slug, office.plan_id, office.area_overrides]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("slug", slug || derivedSlug);
    formData.set("plan_id", planId);
    for (const area of SYSTEM_AREAS) {
      formData.set(`area_override_${area.key}`, areaOverrides[area.key] ?? "inherit");
    }

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
          <Select
            id="edit-plan_id"
            name="plan_id"
            value={planId}
            onChange={(event) => setPlanId(event.target.value)}
          >
            <option value="">Sem plano</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-3 rounded-lg border p-4">
          <div>
            <Label>Áreas do sistema</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Use “Herdar do plano” para seguir a configuração do plano selecionado, ou defina uma exceção para este escritório.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {SYSTEM_AREAS.map((area) => {
              const inherited = inheritedAreas[area.key];
              const override = areaOverrides[area.key] ?? "inherit";
              const effective =
                override === "allow" ? true : override === "block" ? false : inherited;

              return (
                <div key={area.key} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_180px] sm:items-center">
                  <div>
                    <p className="text-sm font-medium">{area.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Plano: {inherited ? "liberado" : "bloqueado"} - Efetivo: {effective ? "liberado" : "bloqueado"}
                    </p>
                  </div>
                  <Select
                    name={`area_override_${area.key}`}
                    value={areaOverrides[area.key] ?? "inherit"}
                    onChange={(event) =>
                      setAreaOverrides((prev) => ({
                        ...prev,
                        [area.key]: event.target.value as "inherit" | "allow" | "block",
                      }))
                    }
                    aria-label={`Acesso à área ${area.label}`}
                  >
                    <option value="inherit">Herdar do plano</option>
                    <option value="allow">Liberar</option>
                    <option value="block">Bloquear</option>
                  </Select>
                </div>
              );
            })}
          </div>
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
