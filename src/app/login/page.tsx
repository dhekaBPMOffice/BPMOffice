"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signInWithPasswordAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowRight } from "lucide-react";

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("timeout"));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [platformLogoUrl, setPlatformLogoUrl] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadDefaultLogo() {
      const supabase = createClient();
      const { data } = await supabase
        .from("branding")
        .select("logo_url")
        .eq("is_default", true)
        .is("office_id", null)
        .maybeSingle();

      setPlatformLogoUrl(data?.logo_url ?? null);
    }

    void loadDefaultLogo();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Login no servidor evita fetch direto do browser → Supabase (bloqueios, extensões, CORS atípicos).
      const result = await withTimeout(signInWithPasswordAction(email, password), 20000);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      router.replace("/escritorio/dashboard");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "timeout") {
        setError("A conexão demorou demais. Verifique a internet e tente de novo.");
        return;
      }
      setError(
        "Não foi possível entrar agora. Confira NEXT_PUBLIC_SUPABASE_URL no .env.local, rede/VPN e se o projeto Supabase está ativo."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen relative overflow-hidden">
      {/* Side panel with dheka visual */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[var(--dheka-navy)] via-[var(--dheka-teal)] to-[var(--dheka-cyan)] items-center justify-center p-12">
        {/* Floating shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[10%] left-[10%] w-40 h-40 rounded-2xl bg-white/10 rotate-12 animate-pulse" />
          <div className="absolute top-[60%] right-[15%] w-24 h-24 rounded-full bg-[var(--dheka-yellow)]/20" />
          <div className="absolute bottom-[15%] left-[20%] w-32 h-32 rounded-xl bg-[var(--dheka-magenta)]/15 -rotate-6" />
          <div className="absolute top-[30%] right-[10%] w-16 h-16 rounded-lg bg-[var(--dheka-green)]/20 rotate-45" />
          <div className="absolute bottom-[40%] left-[5%] w-20 h-20 rounded-full bg-[var(--dheka-purple)]/15" />
        </div>

        <div className="relative z-10 text-white max-w-md space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              {platformLogoUrl ? (
                <img
                  src={platformLogoUrl}
                  alt="Logo da plataforma"
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <svg viewBox="0 0 100 100" className="h-8 w-8">
                  <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" fill="none" stroke="white" strokeWidth="3"/>
                  <polygon points="50,20 80,35 80,65 50,80 20,65 20,35" fill="white" fillOpacity="0.3" stroke="white" strokeWidth="1.5"/>
                </svg>
              )}
            </div>
            <span className="text-2xl font-bold tracking-tight">BPM Office</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            Gerencie processos com inteligência
          </h1>
          <p className="text-lg text-white/80 leading-relaxed">
            Plataforma completa para escritórios de processos de negócio. Organize, analise e melhore com o poder da IA.
          </p>
          <div className="flex gap-3 pt-4">
            <div className="flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-4 py-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-[var(--dheka-green)]" />
              Estratégia
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-4 py-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-[var(--dheka-yellow)]" />
              Processos
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-4 py-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-[var(--dheka-magenta)]" />
              IA
            </div>
          </div>
        </div>
      </div>

      {/* Login form side */}
      <div className="flex flex-1 items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile dheka logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--dheka-teal)] to-[var(--dheka-cyan)] flex items-center justify-center">
              {platformLogoUrl ? (
                <img
                  src={platformLogoUrl}
                  alt="Logo da plataforma"
                  className="h-6 w-auto object-contain"
                />
              ) : (
                <svg viewBox="0 0 100 100" className="h-6 w-6">
                  <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" fill="none" stroke="white" strokeWidth="3"/>
                  <polygon points="50,20 80,35 80,65 50,80 20,65 20,35" fill="white" fillOpacity="0.3" stroke="white" strokeWidth="1.5"/>
                </svg>
              )}
            </div>
            <span className="text-xl font-bold text-foreground">BPM Office</span>
          </div>

          <Card className="border-0 shadow-xl shadow-primary/5">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold text-foreground">Bem-vindo de volta</CardTitle>
              <CardDescription className="text-muted-foreground">
                Acesse sua conta para gerenciar processos de negócio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                  <Link href="/esqueci-senha" className="text-sm text-muted-foreground hover:underline">
                    Esqueci a senha
                  </Link>
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>
                )}

                <Button type="submit" className="w-full h-11 text-base gap-2" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Entrar
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Plataforma BPM Office &middot; Powered by dheka
          </p>
        </div>
      </div>
    </div>
  );
}
