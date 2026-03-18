"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validatePassword, PASSWORD_HINT } from "@/lib/password";
import { confirmarPrimeiroAcesso } from "@/app/primeiro-acesso/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Loader2 } from "lucide-react";

function getPasswordErrorMessage(error: { message?: string }): string {
  const msg = error?.message?.trim() || "";
  if (msg.includes("different from the old password") || msg.includes("should be different")) {
    return "A nova senha deve ser diferente da senha atual.";
  }
  return msg || "Erro ao alterar senha. Tente novamente.";
}

export default function RedefinirSenhaPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setHasSession(!!user);
      setCheckingSession(false);
    }
    checkSession();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const pwdResult = validatePassword(newPassword);
    if (!pwdResult.valid) {
      setError(pwdResult.error ?? "Senha inválida.");
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

    await new Promise((r) => setTimeout(r, 300));

    const result = await confirmarPrimeiroAcesso();

    if (!result.success && result.error === "Não autenticado.") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ must_change_password: false })
          .eq("auth_user_id", user.id);
      }
      router.push("/escritorio/dashboard");
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

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-0 shadow-xl shadow-primary/5">
          <CardContent className="pt-8 pb-8">
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Verificando link...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-0 shadow-xl shadow-primary/5">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <KeyRound className="h-7 w-7 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Link expirado ou inválido</CardTitle>
            <CardDescription>
              O link de recuperação de senha expirou ou já foi utilizado. Solicite um novo link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/esqueci-senha" className="block">
              <Button className="w-full">Solicitar novo link</Button>
            </Link>
            <Link
              href="/login"
              className="mt-4 block text-center text-sm text-muted-foreground hover:underline"
            >
              Voltar ao login
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-0 shadow-xl shadow-primary/5">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--dheka-teal)] to-[var(--dheka-cyan)]">
            <KeyRound className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-2xl">Redefinir senha</CardTitle>
          <CardDescription>
            Crie uma nova senha para acessar sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar senha</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              Redefinir senha
            </Button>

            <Link
              href="/login"
              className="block text-center text-sm text-muted-foreground hover:underline"
            >
              Voltar ao login
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
