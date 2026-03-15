"use client";

import Link from "next/link";
import { Rocket } from "lucide-react";
import type { FirstStep } from "@/lib/manual/config";
import { MANUAL_ICON_MAP } from "@/lib/manual/icons";

interface FirstStepsRadialProps {
  steps: FirstStep[];
}

export function FirstStepsRadial({ steps }: FirstStepsRadialProps) {
  if (steps.length === 0) return null;

  const centerX = 200;
  const centerY = 200;
  const radius = 140;
  const nodeCount = steps.length;

  const nodePositions = steps.map((_, i) => {
    const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  return (
    <section className="rounded-xl border border-border/40 bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
        <Rocket className="h-5 w-5 text-[var(--dheka-teal)]" />
        Os primeiros passos recomendados
      </h2>
      <div className="relative mx-auto aspect-square max-w-[420px]">
        <svg
          viewBox="0 0 400 400"
          className="h-full w-full"
          aria-label="Diagrama de primeiros passos"
        >
          {/* Linhas conectoras do centro aos nodos */}
          {nodePositions.map((pos, i) => (
            <line
              key={i}
              x1={centerX}
              y1={centerY}
              x2={pos.x}
              y2={pos.y}
              stroke="currentColor"
              strokeOpacity={0.25}
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          ))}

          {/* Nodo central */}
          <circle
            cx={centerX}
            cy={centerY}
            r={48}
            fill="var(--dheka-teal)"
            fillOpacity={0.15}
            stroke="var(--dheka-teal)"
            strokeWidth={2}
          />
          <text
            x={centerX}
            y={centerY + 36}
            textAnchor="middle"
            className="fill-foreground text-xs font-medium"
          >
            Primeiros Passos
          </text>

          {/* Nodos radiais */}
          {steps.map((step, i) => {
            const pos = nodePositions[i];
            const Icon = MANUAL_ICON_MAP[step.iconName] ?? Rocket;
            const href = step.href ?? `/escritorio/manual/${step.moduleId}`;
            return (
              <g key={step.step}>
                <foreignObject
                  x={pos.x - 56}
                  y={pos.y - 32}
                  width={112}
                  height={64}
                >
                  <Link
                    href={href}
                    className="flex flex-col items-center justify-center rounded-lg border border-border/60 bg-muted/50 px-3 py-2 transition-colors hover:bg-muted hover:border-[var(--dheka-teal)]/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--dheka-teal)]/20 text-xs font-semibold text-[var(--dheka-teal)]">
                        {step.step}
                      </span>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="mt-1 truncate text-center text-xs font-medium max-w-[100px]">
                      {step.title.length > 12 ? `${step.title.slice(0, 10)}...` : step.title}
                    </span>
                  </Link>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
