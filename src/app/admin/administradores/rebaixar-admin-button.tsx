"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { removerAdminMaster } from "./actions";
import { Button } from "@/components/ui/button";

interface RebaixarAdminButtonProps {
  profileId: string;
  fullName: string;
}

export function RebaixarAdminButton({ profileId, fullName }: RebaixarAdminButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm(`Tem certeza que deseja remover "${fullName}" do papel de administrador master? Ele perderá o acesso à área /admin.`)) {
      return;
    }

    setLoading(true);
    const result = await removerAdminMaster(profileId);
    setLoading(false);

    if (result.success) {
      router.refresh();
    } else {
      alert(result.error ?? "Erro ao rebaixar.");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      {loading ? "..." : "Rebaixar"}
    </Button>
  );
}
