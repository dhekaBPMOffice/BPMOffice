"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resetLeaderPassword } from "@/app/admin/escritorios/actions";
import { validatePassword, PASSWORD_HINT } from "@/lib/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface RedefinirSenhaFormProps {
  officeId: string;
  profileId: string;
  leaderName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RedefinirSenhaForm({
  officeId,
  profileId,
  leaderName,
  open,
  onOpenChange,
}: RedefinirSenhaFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const newPassword = (formData.get("new_password") as string) ?? "";
    const confirmPassword = (formData.get("confirm_password") as string) ?? "";

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      setLoading(false);
      return;
    }

    const pwdResult = validatePassword(newPassword);
    if (!pwdResult.valid) {
      setError(pwdResult.error ?? "Senha inválida.");
      setLoading(false);
      return;
    }

    const result = await resetLeaderPassword(profileId, officeId, newPassword);

    setLoading(false);

    if (result.success) {
      router.refresh();
      onOpenChange(false);
      form.reset();
    } else {
      setError(result.error ?? "Erro ao redefinir senha.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redefinir senha</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Definir nova senha para {leaderName}. O líder precisará usá-la no próximo login.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="new_password">Nova senha</Label>
            <Input
              id="new_password"
              name="new_password"
              type="password"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
            />
            <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirmar senha</Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              minLength={8}
              placeholder="Repita a senha"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Redefinir senha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
