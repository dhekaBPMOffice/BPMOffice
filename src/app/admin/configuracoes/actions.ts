"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isValidIanaTimeZone } from "@/lib/timezone";

export async function savePlatformSettings(data: {
  review_period: number;
  review_unit: string;
  default_techniques_analysis: string[];
  default_techniques_improvement: string[];
  closure_checklist: string[];
  implementation_plan_fields: string[];
  timezone: string;
}) {
  const tz = data.timezone?.trim();
  if (!tz || !isValidIanaTimeZone(tz)) {
    return { error: "Fuso horário inválido. Use um identificador IANA (ex.: America/Sao_Paulo)." };
  }

  const supabase = await createServiceClient();

  const settings: { key: string; value: unknown }[] = [
    { key: "review_period", value: data.review_period },
    { key: "review_unit", value: data.review_unit },
    { key: "default_techniques_analysis", value: data.default_techniques_analysis },
    { key: "default_techniques_improvement", value: data.default_techniques_improvement },
    { key: "closure_checklist", value: data.closure_checklist },
    { key: "implementation_plan_fields", value: data.implementation_plan_fields },
    { key: "timezone", value: tz },
  ];

  for (const { key, value } of settings) {
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key, value }, { onConflict: "key" });

    if (error) return { error: error.message };
  }

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin");
  return { success: true };
}
