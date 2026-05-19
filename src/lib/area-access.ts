import { createServiceClient } from "@/lib/supabase/server";
import { resolveAreaAccess, type AreaAccessMap } from "@/lib/system-areas";

type OfficeAreaAccessRow = {
  area_overrides: Record<string, boolean> | null;
  plans: { features: Record<string, boolean> | null } | null;
};

export async function getOfficeAreaAccess(officeId: string): Promise<AreaAccessMap> {
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from("offices")
    .select(`
      area_overrides,
      plans (
        features
      )
    `)
    .eq("id", officeId)
    .maybeSingle<OfficeAreaAccessRow>();

  return resolveAreaAccess(data?.plans?.features, data?.area_overrides);
}

