"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RebaixarAdminButton } from "./rebaixar-admin-button";
import { RedefinirSenhaAdminForm } from "./redefinir-senha-admin-form";

interface AdminMasterAcoesProps {
  profileId: string;
  fullName: string;
  isSelf: boolean;
  podeRebaixar: boolean;
}

export function AdminMasterAcoes({
  profileId,
  fullName,
  isSelf,
  podeRebaixar,
}: AdminMasterAcoesProps) {
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setResetOpen(true)}
          title={isSelf ? "Redefinir minha senha" : "Redefinir senha"}
        >
          <KeyRound className="h-4 w-4" />
        </Button>
        {podeRebaixar && !isSelf && (
          <RebaixarAdminButton profileId={profileId} fullName={fullName} />
        )}
      </div>
      <RedefinirSenhaAdminForm
        profileId={profileId}
        adminName={fullName}
        isSelf={isSelf}
        open={resetOpen}
        onOpenChange={setResetOpen}
      />
    </>
  );
}
