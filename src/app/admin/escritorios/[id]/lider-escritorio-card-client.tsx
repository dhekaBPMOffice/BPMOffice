"use client";

import dynamic from "next/dynamic";
import type { LeaderData } from "./editar-lider-form";

const LiderEscritorioCard = dynamic(
  () => import("./lider-escritorio-card").then((m) => ({ default: m.LiderEscritorioCard })),
  { ssr: false }
);

interface LiderEscritorioCardClientProps {
  officeId: string;
  leaders: LeaderData[];
}

export function LiderEscritorioCardClient({ officeId, leaders }: LiderEscritorioCardClientProps) {
  return <LiderEscritorioCard officeId={officeId} leaders={leaders} />;
}
