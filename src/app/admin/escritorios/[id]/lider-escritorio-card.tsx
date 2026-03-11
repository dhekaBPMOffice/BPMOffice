"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { CadastrarLiderForm } from "./cadastrar-lider-form";

interface LiderEscritorioCardProps {
  officeId: string;
  hasLeaders: boolean;
}

export function LiderEscritorioCard({ officeId, hasLeaders }: LiderEscritorioCardProps) {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return (
      <CadastrarLiderForm
        officeId={officeId}
        onSuccess={() => setShowForm(false)}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  if (hasLeaders) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowForm(true)}
      >
        <UserPlus className="mr-2 h-4 w-4" />
        Adicionar outro líder
      </Button>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">Nenhum líder cadastrado.</p>
      <Button type="button" onClick={() => setShowForm(true)}>
        <UserPlus className="mr-2 h-4 w-4" />
        Cadastrar líder
      </Button>
    </>
  );
}
