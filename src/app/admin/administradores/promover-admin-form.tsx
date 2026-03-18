"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { promoverAdminMaster } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PromoverAdminForm() {
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
    const email = (formData.get("email") as string)?.trim?.() ?? "";

    const result = await promoverAdminMaster(email);

    setLoading(false);

    if (result.success) {
      setSuccess(true);
      router.refresh();
      form.reset();
    } else {
      setError(result.error ?? "Erro ao promover.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      {success && (
        <p className="rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
          Usuário promovido a administrador master com sucesso.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="email">E-mail do usuário</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="usuario@empresa.com"
            disabled={loading}
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Promovendo..." : "Promover"}
        </Button>
      </div>
    </form>
  );
}
