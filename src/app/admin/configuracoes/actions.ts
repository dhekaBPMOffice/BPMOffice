"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const SETTING_KEYS = [
  "review_period",
  "review_unit",
  "default_techniques_analysis",
  "default_techniques_improvement",
  "closure_checklist",
  "implementation_plan_fields",
] as const;

export async function savePlatformSettings(data: {
  review_period: number;
  review_unit: string;
  default_techniques_analysis: string[];
  default_techniques_improvement: string[];
  closure_checklist: string[];
  implementation_plan_fields: string[];
}) {
  const supabase = await createServiceClient();

  const settings: { key: string; value: unknown }[] = [
    { key: "review_period", value: data.review_period },
    { key: "review_unit", value: data.review_unit },
    { key: "default_techniques_analysis", value: data.default_techniques_analysis },
    { key: "default_techniques_improvement", value: data.default_techniques_improvement },
    { key: "closure_checklist", value: data.closure_checklist },
    { key: "implementation_plan_fields", value: data.implementation_plan_fields },
  ];

  for (const { key, value } of settings) {
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key, value }, { onConflict: "key" });

    if (error) return { error: error.message };
  }

  revalidatePath("/admin/configuracoes");
  return { success: true };
}
