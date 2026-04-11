import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Separa blocos lógicos dentro de formulários com ritmo e separador consistentes. */
export function ProcessWorkspaceFormSection({
  title,
  description,
  children,
  isFirst,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  /** Primeira secção não leva borda superior. */
  isFirst?: boolean;
}) {
  return (
    <div
      className={cn(
        "space-y-4",
        !isFirst && "border-t border-border/40 pt-6"
      )}
    >
      {title ? (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
