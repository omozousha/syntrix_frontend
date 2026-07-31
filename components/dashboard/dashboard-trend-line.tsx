"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

export type TrendDatum = {
  label: string;
  value: number;
};

const DEFAULT_CONFIG: ChartConfig = {
  value: {
    label: "Jumlah",
    color: "var(--color-primary)",
  },
};

export function DashboardTrendLine({
  title,
  description,
  data,
  loading = false,
  color = "var(--color-primary)",
}: {
  title: string;
  description: string;
  data: TrendDatum[];
  loading?: boolean;
  color?: string;
}) {
  const hasData = data.length > 0;

  const config: ChartConfig = {
    value: {
      label: "Jumlah",
      color,
    },
  };

  return (
    <Card className="min-w-0">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {loading ? (
          <Skeleton className="h-[180px] w-full rounded-md" />
        ) : hasData ? (
          <ChartContainer config={config} className="h-[180px] w-full" initialDimension={{ width: 400, height: 180 }}>
            <LineChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-value)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-value)", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "var(--color-value)", strokeWidth: 0 }}
              />
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[180px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            Belum ada data tren.
          </div>
        )}
      </CardContent>
    </Card>
  );
}