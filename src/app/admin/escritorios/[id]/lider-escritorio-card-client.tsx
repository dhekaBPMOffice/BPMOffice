"use client";

import dynamic from "next/dynamic";

const LiderEscritorioCard = dynamic(
  () => import("./lider-escritorio-card").then((m) => ({ default: m.LiderEscritorioCard })),
  { ssr: false }
);

interface LiderEscritorioCardClientProps {
  officeId: string;
  hasLeaders: boolean;
}

export function LiderEscritorioCardClient({ officeId, hasLeaders }: LiderEscritorioCardClientProps) {
  return <LiderEscritorioCard officeId={officeId} hasLeaders={hasLeaders} />;
}
