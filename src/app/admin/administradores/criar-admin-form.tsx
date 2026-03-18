"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarAdminMaster } from "./actions";
import { validatePassword, PASSWORD_HINT } from "@/lib/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CriarAdminForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
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

    const result = await criarAdminMaster({
      full_name: formData.get("full_name") as string,
      email: formData.get("email") as string,
      initial_password: initialPassword,
    });

    setLoading(false);

    if (result.success) {
      setSuccess(true);
      router.refresh();
      form.reset();
    } else {
      setError(result.error ?? "Erro ao criar administrador.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      {success && (
        <p className="rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
          Administrador master criado com sucesso.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="criar_full_name">Nome completo</Label>
        <Input
          id="criar_full_name"
          name="full_name"
          required
          placeholder="Ex: Maria Silva"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="criar_email">E-mail</Label>
        <Input
          id="criar_email"
          name="email"
          type="email"
          required
          placeholder="maria@empresa.com"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="criar_initial_password">Senha inicial</Label>
        <Input
          id="criar_initial_password"
          name="initial_password"
          type="password"
          required
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Criando..." : "Criar administrador"}
      </Button>
    </form>
  );
}
