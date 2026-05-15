"use client";

import * as React from "react";
import { DEFAULT_TIME_ZONE, resolveTimeZone } from "@/lib/timezone";

const TimeZoneContext = React.createContext<string>(DEFAULT_TIME_ZONE);

export function TimezoneProvider({
  children,
  timeZone,
}: {
  children: React.ReactNode;
  timeZone: string;
}) {
  const resolved = React.useMemo(() => resolveTimeZone(timeZone, DEFAULT_TIME_ZONE), [timeZone]);

  return <TimeZoneContext.Provider value={resolved}>{children}</TimeZoneContext.Provider>;
}

export function useTimeZone(): string {
  return React.useContext(TimeZoneContext);
}
