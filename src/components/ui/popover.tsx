"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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

const POPOVER_SHADOW =
  "0 8px 30px rgb(0 0 0 / 0.12), 0 2px 8px rgb(0 0 0 / 0.06)";

export function PopoverContent({
  className,
  align = "end",
  sideOffset = 8,
  children,
  style: styleProp,
  ...props
}: PopoverContentProps) {
  const ctx = React.useContext(PopoverContext);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = React.useState({ top: 0, left: 0 });

  const updatePosition = React.useCallback(() => {
    if (!ctx) return;
    const trigger = ctx.triggerRef.current;
    const el = contentRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const measured = el?.offsetWidth ?? 0;
    const w =
      measured > 0
        ? measured
        : align === "end"
          ? 360
          : 280;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
    const margin = 8;
    let left = r.left;
    if (align === "end") {
      left = r.right - w;
    } else if (align === "center") {
      left = r.left + r.width / 2 - w / 2;
    }
    left = Math.max(margin, Math.min(left, vw - w - margin));
    setCoords({ top: r.bottom + sideOffset, left });
  }, [ctx, align, sideOffset]);

  React.useLayoutEffect(() => {
    if (!ctx?.open) return;
    updatePosition();
    const el = contentRef.current;
    const ro = el ? new ResizeObserver(() => updatePosition()) : null;
    if (el && ro) ro.observe(el);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);
    const id = requestAnimationFrame(() => updatePosition());
    return () => {
      cancelAnimationFrame(id);
      ro?.disconnect();
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
    };
  }, [ctx?.open, updatePosition]);

  React.useEffect(() => {
    if (!ctx?.open) return;

    function handleClickOutside(e: MouseEvent) {
      if (!ctx) return;
      const target = e.target as Node;
      if (
        contentRef.current?.contains(target) ||
        ctx.triggerRef.current?.contains(target)
      )
        return;
      ctx.setOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") ctx?.setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ctx?.open, ctx?.setOpen, ctx?.triggerRef]);

  if (!ctx?.open) return null;

  const node = (
    <div
      ref={contentRef}
      className={cn(
        "fixed z-[9999] min-w-[280px] max-w-[360px] rounded-xl border border-border/60 bg-[var(--color-popover)] p-0 shadow-lg",
        className
      )}
      style={{
        top: coords.top,
        left: coords.left,
        boxShadow: POPOVER_SHADOW,
        ...styleProp,
      }}
      {...props}
    >
      {children}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}
