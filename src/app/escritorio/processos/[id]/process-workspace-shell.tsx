import type { ReactNode } from "react";

/** Ritmo macro; largura total da área de conteúdo da página (sem cap horizontal). */
export function ProcessWorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <div className="w-full min-w-0 space-y-8 [word-spacing:normal]">
      {children}
    </div>
  );
}
