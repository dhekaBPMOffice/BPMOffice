"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createStrategicPlan } from "../actions";

export default function NovoPlanoPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function create() {
      if (creating) return;
      setCreating(true);
      const result = await createStrategicPlan(
        `Planejamento ${new Date().getFullYear()}`,
        new Date().getFullYear()
      );
      if (result.data) {
        router.replace(`/escritorio/estrategia/swot/${result.data.id}`);
      } else {
        router.replace("/escritorio/estrategia/swot");
      }
    }
    create();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-2">
        <div className="h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground">Criando novo plano...</p>
      </div>
    </div>
  );
}
