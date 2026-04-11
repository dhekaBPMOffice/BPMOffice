"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertTriangle } from "lucide-react";
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

interface CriticalityDatum {
  name: string;
  value: number;
  color: string;
}

interface CriticalityChartProps {
  data: CriticalityDatum[];
}

export function CriticalityChart({ data }: CriticalityChartProps) {
  const hasData = data.some((item) => item.value > 0);

  return (
    <Card className="overflow-hidden border-border/60 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Termômetro de Criticidade
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Distribuição dos processos por nível de criticidade
        </p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyState
            icon={AlertTriangle}
            title="Sem criticidade registrada"
            description="A distribuição será exibida assim que houver análises com nível de criticidade preenchido."
          />
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
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
                  {data.map((entry, index) => (
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
        )}
      </CardContent>
    </Card>
  );
}
