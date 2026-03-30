"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, LogOut } from "lucide-react";

export default function ContaInativaPage() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-0 shadow-xl shadow-primary/5">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--dheka-yellow)] to-[var(--dheka-lime)]">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-2xl">Escritório inativo</CardTitle>
          <CardDescription>
            O acesso ao BPM Office para este escritório foi suspenso. Os dados foram mantidos. Entre em contato com o administrador da plataforma se precisar reativar o escritório.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button variant="outline" className="w-full" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair e voltar ao login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
