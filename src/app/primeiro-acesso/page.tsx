"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { confirmarPrimeiroAcesso } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Loader2, LogOut } from "lucide-react";

function getPasswordErrorMessage(error: { message?: string }): string {
  const msg = error?.message?.trim() || "";
  if (msg.includes("different from the old password") || msg.includes("should be different")) {
    return "A nova senha deve ser diferente da senha atual.";
  }
  return msg || "Erro ao alterar senha. Tente novamente.";
}

export default function FirstAccessPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(getPasswordErrorMessage(updateError));
      setLoading(false);
      return;
    }

    // Pequena pausa para os cookies da sessão serem atualizados após a troca de senha
    await new Promise((r) => setTimeout(r, 300));

    let result = await confirmarPrimeiroAcesso();

    // Se o servidor não recebeu a sessão ainda, atualiza o perfil no cliente e redireciona pelo middleware
    if (!result.success && result.error === "Não autenticado.") {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ must_change_password: false })
          .eq("auth_user_id", user.id);
      }
      router.push("/login");
      router.refresh();
      return;
    }

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(result.redirectTo);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-0 shadow-xl shadow-primary/5">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--dheka-teal)] to-[var(--dheka-cyan)]">
            <KeyRound className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-2xl">Primeiro Acesso</CardTitle>
          <CardDescription>
            Por segurança, você precisa criar uma nova senha antes de continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Alterar Senha e Continuar
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full mt-2"
              onClick={handleSignOut}
              disabled={loading}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair e usar outro usuário
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
