"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addManualOfficeProcess } from "../actions";
import { Button } from "@/components/ui/button";

export function AddProcessButton({ baseProcessId }: { baseProcessId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const result = await addManualOfficeProcess(baseProcessId);
    if ("error" in result && result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={loading} size="sm">
        {loading ? "Adicionando..." : "Adicionar à lista"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
