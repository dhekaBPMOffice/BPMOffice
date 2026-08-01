"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resetAdminMasterPassword } from "./actions";
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

interface RedefinirSenhaAdminFormProps {
  profileId: string;
  adminName: string;
  isSelf: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RedefinirSenhaAdminForm({
  profileId,
  adminName,
  isSelf,
  open,
  onOpenChange,
}: RedefinirSenhaAdminFormProps) {
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

    const result = await resetAdminMasterPassword(profileId, newPassword);

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
          <DialogTitle>{isSelf ? "Redefinir minha senha" : "Redefinir senha"}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isSelf
              ? "Defina uma nova senha para sua conta de administrador master."
              : `Definir nova senha para ${adminName}. No próximo login, será solicitada a troca da senha.`}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="admin_new_password">Nova senha</Label>
            <Input
              id="admin_new_password"
              name="new_password"
              type="password"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_confirm_password">Confirmar senha</Label>
            <Input
              id="admin_confirm_password"
              name="confirm_password"
              type="password"
              required
              minLength={8}
              placeholder="Repita a senha"
              autoComplete="new-password"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
