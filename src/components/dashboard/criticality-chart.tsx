"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const SAMPLE_DATA = [
  { name: "Baixa", value: 12, color: "var(--criticality-low)" },
  { name: "Média", value: 8, color: "var(--criticality-medium)" },
  { name: "Alta", value: 5, color: "var(--criticality-high)" },
  { name: "Crítica", value: 2, color: "var(--criticality-critical)" },
];

export function CriticalityChart() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Termômetro de Criticidade
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Distribuição dos processos por nível de criticidade
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={SAMPLE_DATA}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis
                type="category"
                dataKey="name"
                width={60}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-block)",
                  color: "var(--color-foreground)",
                }}
                formatter={(value) => [value ?? 0, "Processos"]}
                labelFormatter={(label) => `Criticidade: ${label}`}
              />
              <Bar
                dataKey="value"
                radius={[0, 6, 6, 0]}
                barSize={28}
                strokeWidth={1.5}
              >
                {SAMPLE_DATA.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke={entry.color}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
