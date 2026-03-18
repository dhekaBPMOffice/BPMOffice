"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUser } from "../actions";
import { validatePassword, PASSWORD_HINT } from "@/lib/password";
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
import { ArrowLeft } from "lucide-react";

interface CustomRole {
  id: string;
  name: string;
}

interface NovoUsuarioFormProps {
  customRoles: CustomRole[];
}

export function NovoUsuarioForm({ customRoles }: NovoUsuarioFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const initialPassword = formData.get("initial_password") as string;

    const pwdResult = validatePassword(initialPassword);
    if (!pwdResult.valid) {
      setError(pwdResult.error ?? "Senha inválida.");
      setLoading(false);
      return;
    }

    const result = await createUser({
      full_name: formData.get("full_name") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || undefined,
      department: (formData.get("department") as string) || undefined,
      job_title: (formData.get("job_title") as string) || undefined,
      custom_role_id: formData.get("custom_role_id")
        ? (formData.get("custom_role_id") as string)
        : null,
      initial_password: initialPassword,
    });

    setLoading(false);

    if (result.success) {
      router.push("/escritorio/usuarios");
      router.refresh();
    } else {
      setError(result.error ?? "Erro ao criar usuário.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados do usuário</CardTitle>
        <CardDescription>
          Preencha os campos para criar um novo usuário. O usuário precisará trocar a senha no primeiro acesso.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                name="full_name"
                required
                placeholder="João da Silva"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="joao@exemplo.com"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Input
                id="department"
                name="department"
                placeholder="TI, RH, etc."
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="job_title">Cargo</Label>
              <Input
                id="job_title"
                name="job_title"
                placeholder="Analista, Coordenador, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom_role_id">Perfil customizado</Label>
              <Select id="custom_role_id" name="custom_role_id">
                <option value="">Nenhum (usuário padrão)</option>
                {customRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="initial_password">Senha inicial</Label>
            <Input
              id="initial_password"
              name="initial_password"
              type="password"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
            />
            <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar usuário"}
            </Button>
            <Link
              href="/escritorio/usuarios"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
