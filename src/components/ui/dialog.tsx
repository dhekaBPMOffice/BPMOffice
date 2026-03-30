"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DialogCloseContext = React.createContext<null | (() => void)>(null);

/** Fecha o modal mais próximo (útil em botões “Cancelar” dentro do painel). */
export function useDialogClose() {
  return React.useContext(DialogCloseContext);
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  /** Largura máxima do conteúdo (padrão: max-w-lg). */
  containerClassName?: string;
}

export function Dialog({ open, onOpenChange, children, containerClassName }: DialogProps) {
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <DialogCloseContext.Provider value={close}>
      <div className="fixed inset-0 z-50">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onClick={close} />
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          onClick={close}
          role="presentation"
        >
          <div
            className={cn("relative z-50 w-full", containerClassName ?? "max-w-lg")}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </div>
    </DialogCloseContext.Provider>
  );
}

export function DialogContent({
  className,
  children,
  onClose,
  showCloseButton = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  onClose?: () => void;
  /** Quando false, oculta o botão X (casos raros). Padrão: true. */
  showCloseButton?: boolean;
}) {
  const close = React.useContext(DialogCloseContext);

  const handleClose = React.useCallback(() => {
    close?.();
    onClose?.();
  }, [close, onClose]);

  const showX = Boolean(showCloseButton && close);

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border/60 bg-card p-6 max-h-[90vh] overflow-y-auto",
        className,
        showX && "pr-12"
      )}
      role="dialog"
      aria-modal="true"
      {...props}
    >
      {showX && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-8 w-8 shrink-0"
          onClick={handleClose}
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      {children}
    </div>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 space-y-1.5", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex justify-end gap-2", className)} {...props} />;
}
