"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DEFAULT_TIME_ZONE } from "@/lib/timezone";

interface TimeZoneOption {
  value: string;
  label: string;
  keywords?: string;
}

const STANDARD_TIME_ZONES: TimeZoneOption[] = [
  {
    value: "America/Sao_Paulo",
    label: "Brasil - Brasilia/Sao Paulo (America/Sao_Paulo)",
    keywords: "brasil brasilia sao paulo df distrito federal gmt-3 brt",
  },
  {
    value: "America/Belem",
    label: "Brasil - Belem/Fortaleza/Recife/Salvador (America/Belem)",
    keywords: "brasil belem fortaleza recife salvador nordeste norte gmt-3 brt",
  },
  {
    value: "America/Manaus",
    label: "Brasil - Manaus/Amazonas (America/Manaus)",
    keywords: "brasil manaus amazonas amazonico gmt-4 amt",
  },
  {
    value: "America/Cuiaba",
    label: "Brasil - Cuiaba/Mato Grosso (America/Cuiaba)",
    keywords: "brasil cuiaba mato grosso centro oeste gmt-4 amt",
  },
  {
    value: "America/Noronha",
    label: "Brasil - Fernando de Noronha (America/Noronha)",
    keywords: "brasil fernando noronha gmt-2 fnt",
  },
  {
    value: "America/Rio_Branco",
    label: "Brasil - Rio Branco/Acre (America/Rio_Branco)",
    keywords: "brasil rio branco acre gmt-5 act",
  },
  { value: "UTC", label: "UTC - Tempo Universal Coordenado", keywords: "utc gmt zulu" },
  {
    value: "America/New_York",
    label: "EUA - Leste/New York (America/New_York)",
    keywords: "est eastern new york miami boston washington",
  },
  {
    value: "America/Chicago",
    label: "EUA - Central/Chicago (America/Chicago)",
    keywords: "cst central chicago dallas houston",
  },
  {
    value: "America/Denver",
    label: "EUA - Montanhas/Denver (America/Denver)",
    keywords: "mst mountain denver",
  },
  {
    value: "America/Los_Angeles",
    label: "EUA - Pacifico/Los Angeles (America/Los_Angeles)",
    keywords: "pst pacific los angeles san francisco seattle",
  },
  {
    value: "Europe/Lisbon",
    label: "Portugal - Lisboa (Europe/Lisbon)",
    keywords: "portugal lisboa lisbon",
  },
  {
    value: "Europe/London",
    label: "Reino Unido - Londres (Europe/London)",
    keywords: "uk reino unido london londres gmt bst",
  },
  {
    value: "Europe/Madrid",
    label: "Espanha - Madrid (Europe/Madrid)",
    keywords: "espanha spain madrid",
  },
  {
    value: "Europe/Paris",
    label: "Franca - Paris (Europe/Paris)",
    keywords: "franca france paris cet",
  },
  {
    value: "Europe/Berlin",
    label: "Alemanha - Berlim (Europe/Berlin)",
    keywords: "alemanha germany berlin berlim cet",
  },
  {
    value: "Asia/Tokyo",
    label: "Japao - Toquio (Asia/Tokyo)",
    keywords: "japao japan tokyo toquio jst",
  },
  {
    value: "Asia/Shanghai",
    label: "China - Shanghai (Asia/Shanghai)",
    keywords: "china shanghai beijing cst",
  },
  {
    value: "Australia/Sydney",
    label: "Australia - Sydney (Australia/Sydney)",
    keywords: "australia sydney aest",
  },
];

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function allTimeZones(): TimeZoneOption[] {
  const byValue = new Map<string, TimeZoneOption>();
  for (const zone of STANDARD_TIME_ZONES) {
    byValue.set(zone.value, zone);
  }

  try {
    const v = Intl.supportedValuesOf("timeZone");
    for (const value of v) {
      if (!byValue.has(value)) {
        byValue.set(value, { value, label: value });
      }
    }
  } catch {
    // A lista padrão acima já cobre os fusos mais usados quando a API não existe.
  }

  return [...byValue.values()].sort((a, b) => {
    const aStandard = STANDARD_TIME_ZONES.some((z) => z.value === a.value);
    const bStandard = STANDARD_TIME_ZONES.some((z) => z.value === b.value);
    if (aStandard !== bStandard) return aStandard ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
}

export interface TimezoneSelectProps {
  /** Valor IANA; null só quando allowInherit — herda o fuso da plataforma. */
  value: string | null;
  onChange: (tz: string | null) => void;
  allowInherit?: boolean;
  inheritLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function TimezoneSelect({
  value,
  onChange,
  allowInherit = false,
  inheritLabel = "Padrão da plataforma",
  disabled = false,
  className,
}: TimezoneSelectProps) {
  const zones = React.useMemo(() => allTimeZones(), []);
  const [filter, setFilter] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = normalizeSearch(filter.trim());
    if (!q) return zones;
    return zones.filter((z) =>
      normalizeSearch(`${z.label} ${z.value} ${z.keywords ?? ""}`).includes(q)
    );
  }, [zones, filter]);

  const selectedOption = zones.find((z) => z.value === value);

  const displayLabel =
    allowInherit && (value == null || value === "")
      ? inheritLabel
      : selectedOption
        ? selectedOption.label
        : value && value.trim()
          ? value.trim()
        : DEFAULT_TIME_ZONE;

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="w-full max-w-md">
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full max-w-md justify-between font-normal"
          >
            <span className="truncate">{displayLabel}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="flex max-h-[min(420px,70vh)] w-[min(360px,calc(100vw-2rem))] flex-col p-2" align="start">
          <Input
            placeholder="Buscar fuso (ex. Brasil, Brasilia, Sao Paulo...)"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mb-2"
            autoComplete="off"
          />
          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border/50">
            {allowInherit ? (
              <button
                type="button"
                className={cn(
                  "flex w-full px-3 py-2 text-left text-sm hover:bg-muted/80",
                  (value == null || value === "") && "bg-muted"
                )}
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                {inheritLabel}
              </button>
            ) : null}
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">Nenhum fuso corresponde à busca.</p>
            ) : (
              filtered.map((z) => (
                <button
                  key={z.value}
                  type="button"
                  className={cn(
                    "flex w-full px-3 py-2 text-left text-sm hover:bg-muted/80",
                    value === z.value && "bg-muted"
                  )}
                  onClick={() => {
                    onChange(z.value);
                    setOpen(false);
                  }}
                >
                  <span className="flex flex-col">
                    <span>{z.label}</span>
                    {z.label !== z.value ? (
                      <span className="text-xs text-muted-foreground">{z.value}</span>
                    ) : null}
                  </span>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
