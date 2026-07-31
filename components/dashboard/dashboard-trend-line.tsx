"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type TrendDatum = {
  label: string;
  value: number;
};

export function DashboardTrendLine({
  title,
  description,
  data,
  loading = false,
  color = "#2563eb",
}: {
  title: string;
  description: string;
  data: TrendDatum[];
  loading?: boolean;
  color?: string;
}) {
  const hasData = data.length > 0;

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
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
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
                  <Tooltip
                    contentStyle={{ fontSize: "10px", borderRadius: "6px", background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                    itemStyle={{ padding: "0px", color: "var(--foreground)" }}
                  />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: color, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[180px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            Belum ada data tren.
          </div>
        )}
      </CardContent>
    </Card>
  );
}