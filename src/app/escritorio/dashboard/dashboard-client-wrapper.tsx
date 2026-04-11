"use client";

import { DashboardContent, type DashboardHomeData } from "./dashboard-content";

interface DashboardClientWrapperProps {
  data: DashboardHomeData;
}

export function DashboardClientWrapper({ data }: DashboardClientWrapperProps) {
  return <DashboardContent data={data} />;
}
