"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createOffice } from "../actions";
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
import { PageLayout } from "@/components/layout/page-layout";
import { Building2 } from "lucide-react";

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

interface NovoEscritorioFormProps {
  plans: { id: string; name: string }[];
}

export function NovoEscritorioForm({ plans }: NovoEscritorioFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  useEffect(() => {
    setSlug(generateSlug(name));
  }, [name]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.set("slug", slug);

    const result = await createOffice(formData);

    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    router.push("/admin/escritorios");
  }

  return (
    <PageLayout
      title="Novo Escritório"
      description="Cadastre um novo escritório na plataforma."
      icon={Building2}
      backHref="/admin/escritorios"
      backLabel="Voltar para escritórios"
    >

      <Card>
        <CardHeader>
          <CardTitle>Dados do Escritório</CardTitle>
          <CardDescription>
            Preencha os campos para criar um novo escritório.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Escritório Exemplo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="exemplo-escritorio"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Gerado automaticamente a partir do nome. Pode ser editado.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan_id">Plano</Label>
              <Select id="plan_id" name="plan_id">
                <option value="">Selecione um plano</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Criando..." : "Criar Escritório"}
              </Button>
              <Link href="/admin/escritorios" className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 text-sm font-medium">
                Cancelar
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
