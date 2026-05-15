/** Fuso padrão quando nada está configurado ou o valor é inválido. */
export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

export function isValidIanaTimeZone(tz: string): boolean {
  const t = tz?.trim();
  if (!t) return false;
  try {
    Intl.DateTimeFormat("pt-BR", { timeZone: t }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(
  tz: string | null | undefined,
  fallback: string = DEFAULT_TIME_ZONE
): string {
  if (tz == null) return fallback;
  const t = String(tz).trim();
  if (!t) return fallback;
  return isValidIanaTimeZone(t) ? t : fallback;
}

function asDate(date: Date | string): Date {
  return typeof date === "string" ? new Date(date) : date;
}

/** Formatação genérica pt-BR num fuso IANA (para casos com month: "long", weekday, etc.). */
export function formatInTimeZone(
  date: Date | string,
  timeZone: string,
  options: Omit<Intl.DateTimeFormatOptions, "timeZone">
): string {
  const tz = resolveTimeZone(timeZone);
  return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: tz }).format(asDate(date));
}

/** Data numérica pt-BR (sem horário), num fuso IANA. */
export function formatDatePtBr(date: Date | string, timeZone: string): string {
  return formatInTimeZone(date, timeZone, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Data e hora pt-BR num fuso IANA. */
export function formatDateTimePtBr(date: Date | string, timeZone: string): string {
  return formatInTimeZone(date, timeZone, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Lê timezone salvo em platform_settings (JSONB).
 * Valores antigos podem vir como string JSON direta.
 */
export function parsePlatformTimeZoneValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const t = value.trim();
    return t || null;
  }
  return null;
}
