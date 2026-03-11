"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIdentity } from "@/components/providers/identity-provider";
import { makeGradientFromHex, type GradientStyle } from "@/lib/color";

export type IconChipVariant = "teal" | "purple" | "warm" | "mixed" | "brand" | "custom";
export type IconChipSize = "sm" | "md" | "lg";

type IconComponent = LucideIcon | React.ComponentType<{ className?: string }>;

export interface IconChipProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: IconComponent;
  variant?: IconChipVariant;
  size?: IconChipSize;
  customGradient?: string;
}

export function IconChip({
  icon: Icon,
  variant = "teal",
  size = "md",
  customGradient,
  className,
  style,
  ...props
}: IconChipProps) {
  const identity = useIdentity();

  let variantClass = "";
  let gradientStyle: GradientStyle | undefined;

  if (variant === "brand") {
    const primary = identity?.primaryColor;
    if (primary) {
      gradientStyle = { backgroundImage: makeGradientFromHex(primary) };
    } else {
      variantClass = "icon-chip-teal";
    }
  } else if (variant === "custom") {
    if (customGradient) {
      gradientStyle = { backgroundImage: customGradient };
    } else {
      variantClass = "icon-chip-teal";
    }
  } else {
    switch (variant) {
      case "teal":
        variantClass = "icon-chip-teal";
        break;
      case "purple":
        variantClass = "icon-chip-purple";
        break;
      case "warm":
        variantClass = "icon-chip-warm";
        break;
      case "mixed":
        variantClass = "icon-chip-mixed";
        break;
    }
  }

  const sizeClass =
    size === "sm" ? "icon-chip-sm" : size === "lg" ? "icon-chip-lg" : "icon-chip-md";

  const content = Icon ? <Icon className="h-4 w-4 text-white" /> : props.children;

  return (
    <div
      className={cn("icon-chip", sizeClass, variantClass, className)}
      style={{ ...(gradientStyle ?? {}), ...(style ?? {}) }}
      {...props}
    >
      {content}
    </div>
  );
}

