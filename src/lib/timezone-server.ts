import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import {
  DEFAULT_TIME_ZONE,
  isValidIanaTimeZone,
  parsePlatformTimeZoneValue,
  resolveTimeZone,
} from "@/lib/timezone";

/** Fuso da plataforma (admin). Usa cache por request. */
export const getPlatformTimeZone = cache(async (): Promise<string> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "timezone")
    .maybeSingle();

  const raw = parsePlatformTimeZoneValue(data?.value);
  if (raw && isValidIanaTimeZone(raw)) return raw;
  return DEFAULT_TIME_ZONE;
});

/**
 * Fuso efetivo do escritório: coluna office_config.timezone ou fallback plataforma.
 */
export const getEffectiveOfficeTimeZone = cache(async (officeId: string): Promise<string> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("office_config")
    .select("timezone")
    .eq("office_id", officeId)
    .maybeSingle();

  const officeTz = data?.timezone?.trim();
  if (officeTz && isValidIanaTimeZone(officeTz)) return officeTz;

  const platform = await getPlatformTimeZone();
  return resolveTimeZone(platform, DEFAULT_TIME_ZONE);
});

/** Fuso efetivo para páginas server do escritório (mesma regra do layout). */
export const getSessionOfficeTimeZone = cache(async (): Promise<string> => {
  const profile = await getProfile();
  if (!profile.office_id) return getPlatformTimeZone();
  return getEffectiveOfficeTimeZone(profile.office_id);
});
