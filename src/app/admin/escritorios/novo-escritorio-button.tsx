"use client";

import { Plus } from "lucide-react";
import { createDraftOfficeAndRedirect } from "./actions";

export function NovoEscritorioButton() {
  return (
    <form action={createDraftOfficeAndRedirect} className="inline">
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--identity-primary)] text-[var(--identity-primary-foreground)] shadow-sm hover:shadow hover:brightness-110 h-10 px-4 py-2 text-sm font-medium transition-all duration-150"
      >
        <Plus className="h-4 w-4" />
        Novo Escritório
      </button>
    </form>
  );
}
