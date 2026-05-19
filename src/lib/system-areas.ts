export const SYSTEM_AREAS = [
  { key: "dashboard", label: "Dashboard", featureKey: "area_dashboard" },
  { key: "estrategia", label: "Estratégia", featureKey: "area_estrategia" },
  { key: "processos", label: "Processos", featureKey: "area_processos" },
  { key: "demandas", label: "Demandas", featureKey: "area_demandas" },
  { key: "conhecimento", label: "Conhecimento", featureKey: "area_conhecimento" },
  { key: "capacitacao", label: "Capacitação", featureKey: "area_capacitacao" },
] as const;

export type SystemAreaKey = (typeof SYSTEM_AREAS)[number]["key"];
export type AreaAccessMap = Record<SystemAreaKey, boolean>;
export type AreaOverrides = Partial<Record<SystemAreaKey, boolean>>;

export const DEFAULT_AREA_ACCESS: AreaAccessMap = Object.fromEntries(
  SYSTEM_AREAS.map((area) => [area.key, false])
) as AreaAccessMap;

export function getAreaFeatureKey(areaKey: SystemAreaKey): string {
  return SYSTEM_AREAS.find((area) => area.key === areaKey)?.featureKey ?? `area_${areaKey}`;
}

function readBooleanRecord(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean")
  );
}

export function resolveAreaAccess(
  planFeatures: unknown,
  officeOverrides: unknown
): AreaAccessMap {
  const features = readBooleanRecord(planFeatures);
  const overrides = readBooleanRecord(officeOverrides);

  return Object.fromEntries(
    SYSTEM_AREAS.map((area) => {
      const override = overrides[area.key];
      const planAccess = features[area.featureKey];
      return [area.key, override ?? planAccess ?? DEFAULT_AREA_ACCESS[area.key]];
    })
  ) as AreaAccessMap;
}

export function getFirstAllowedOfficePath(allowedAreas: AreaAccessMap): string {
  if (allowedAreas.dashboard) return "/escritorio/dashboard";
  if (allowedAreas.estrategia) return "/escritorio/estrategia";
  if (allowedAreas.processos) return "/escritorio/estrategia/cadeia-valor?aba=gestao";
  if (allowedAreas.demandas) return "/escritorio/demandas";
  if (allowedAreas.conhecimento) return "/escritorio/conhecimento";
  if (allowedAreas.capacitacao) return "/escritorio/capacitacao";
  return "/escritorio/manual";
}

