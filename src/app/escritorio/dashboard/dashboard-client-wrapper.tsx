"use client";

import dynamic from "next/dynamic";
import type { DashboardMetrics } from "./dashboard-content";
import type { ActivityItem } from "@/components/dashboard/activity-feed";

const DashboardContent = dynamic(
  () => import("./dashboard-content").then((m) => ({ default: m.DashboardContent })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
        Carregando dashboard…
      </div>
    ),
  }
);

interface DashboardClientWrapperProps {
  metrics: DashboardMetrics;
  activityItems: ActivityItem[];
}

export function DashboardClientWrapper({ metrics, activityItems }: DashboardClientWrapperProps) {
  return <DashboardContent metrics={metrics} activityItems={activityItems} />;
}
