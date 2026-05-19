import { createServiceClient } from "@/lib/supabase/server";

export const PROCESS_MANAGEMENT_VERSIONS = ["complete", "simple"] as const;
export type ProcessManagementVersion = (typeof PROCESS_MANAGEMENT_VERSIONS)[number];

export const DEFAULT_PROCESS_MANAGEMENT_VERSION: ProcessManagementVersion = "complete";

type OfficeProcessManagementVersionRow = {
  plans: { features: Record<string, unknown> | null } | null;
};

export function resolveProcessManagementVersion(features: unknown): ProcessManagementVersion {
  if (!features || typeof features !== "object" || Array.isArray(features)) {
    return DEFAULT_PROCESS_MANAGEMENT_VERSION;
  }

  const value = (features as Record<string, unknown>).process_management_version;
  return value === "simple" || value === "complete"
    ? value
    : DEFAULT_PROCESS_MANAGEMENT_VERSION;
}

export async function getOfficeProcessManagementVersion(
  officeId: string
): Promise<ProcessManagementVersion> {
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from("offices")
    .select(`
      plans (
        features
      )
    `)
    .eq("id", officeId)
    .maybeSingle<OfficeProcessManagementVersionRow>();

  return resolveProcessManagementVersion(data?.plans?.features);
}
