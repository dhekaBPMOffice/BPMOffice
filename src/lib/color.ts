import type React from "react";

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function normalizeHex(hex: string, fallback = "#0097a7"): string {
  if (!hex) return fallback;
  const trimmed = hex.trim();
  if (/^#([0-9a-fA-F]{6})$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return fallback;
}

/**
 * Gera um gradiente suave a partir de uma cor base em hex.
 * Usa uma versão levemente escurecida e outra levemente clareada da mesma cor.
 */
export function makeGradientFromHex(hex: string): string {
  const base = normalizeHex(hex);
  const n = base.slice(1);
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);

  // Mistura simples com preto e branco para gerar variações
  const darkR = clampChannel(r * 0.9);
  const darkG = clampChannel(g * 0.9);
  const darkB = clampChannel(b * 0.9);

  const lightR = clampChannel(r + (255 - r) * 0.18);
  const lightG = clampChannel(g + (255 - g) * 0.18);
  const lightB = clampChannel(b + (255 - b) * 0.18);

  const dark = `#${darkR.toString(16).padStart(2, "0")}${darkG
    .toString(16)
    .padStart(2, "0")}${darkB.toString(16).padStart(2, "0")}`;
  const light = `#${lightR.toString(16).padStart(2, "0")}${lightG
    .toString(16)
    .padStart(2, "0")}${lightB.toString(16).padStart(2, "0")}`;

  return `linear-gradient(135deg, ${dark}, ${light})`;
}

export type GradientStyle = Pick<React.CSSProperties, "backgroundImage">;

