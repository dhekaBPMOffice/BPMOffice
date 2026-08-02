"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLeader } from "@/app/admin/escritorios/actions";
import { validatePassword, PASSWORD_HINT } from "@/lib/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CadastrarLiderFormProps {
  officeId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CadastrarLiderForm({
  officeId,
  onSuccess,
  onCancel,
}: CadastrarLiderFormProps) {
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

    const result = await createLeader(officeId, {
      full_name: formData.get("full_name") as string,
      email: formData.get("email") as string,
      initial_password: initialPassword,
    });

    setLoading(false);

    if (result.success) {
      router.refresh();
      onSuccess?.();
    } else {
      setError(result.error ?? "Erro ao cadastrar líder.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="full_name" required>Nome completo</Label>
        <Input
          id="full_name"
          name="full_name"
          required
          placeholder="Ex: Maria Silva"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" required>E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="maria@escritorio.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="initial_password" required>Senha inicial</Label>
        <Input
          id="initial_password"
          name="initial_password"
          type="password"
          required
          minLength={8}
          placeholder="Mínimo 8 caracteres"
        />
        <p className="text-xs text-muted-foreground">
          {PASSWORD_HINT} O líder precisará trocar a senha no primeiro acesso.
        </p>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Cadastrando..." : "Cadastrar líder"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
