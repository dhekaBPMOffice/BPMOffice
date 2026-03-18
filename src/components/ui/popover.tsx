"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Popover({ open: controlledOpen, onOpenChange, children }: PopoverProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLDivElement>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}

interface PopoverTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function PopoverTrigger({ asChild, children, className }: PopoverTriggerProps) {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) throw new Error("PopoverTrigger must be used inside Popover");

  const handleClick = () => ctx.setOpen(!ctx.open);

  return (
    <div
      ref={ctx.triggerRef}
      className={cn("inline-block", className)}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      {children}
    </div>
  );
}

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

export function PopoverContent({
  className,
  align = "end",
  sideOffset = 8,
  children,
  ...props
}: PopoverContentProps) {
  const ctx = React.useContext(PopoverContext);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!ctx?.open) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        contentRef.current?.contains(target) ||
        ctx.triggerRef.current?.contains(target)
      ) return;
      ctx.setOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") ctx.setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ctx?.open, ctx?.setOpen, ctx?.triggerRef]);

  if (!ctx?.open) return null;

  const alignClass =
    align === "start"
      ? "left-0"
      : align === "center"
        ? "left-1/2 -translate-x-1/2"
        : "right-0";

  return (
    <div
      ref={contentRef}
      className={cn(
        "absolute z-[9999] mt-2 min-w-[280px] max-w-[360px] rounded-xl border border-border/60 bg-[var(--color-popover)] p-0 shadow-lg",
        alignClass,
        className
      )}
      style={{
        top: `calc(100% + ${sideOffset}px)`,
        boxShadow: "0 8px 30px rgb(0 0 0 / 0.12), 0 2px 8px rgb(0 0 0 / 0.06)",
      }}
      {...props}
    >
      {children}
    </div>
  );
}
