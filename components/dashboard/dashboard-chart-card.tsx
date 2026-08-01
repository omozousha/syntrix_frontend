"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Cell, Pie, PieChart } from "recharts";

export type DashboardChartDatum = {
  label: string;
  value: number;
  color?: string;
  href?: string;
};

const DEFAULT_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#64748b"];

export function DashboardDonutChartCard({
  title,
  description,
  data,
  emptyLabel,
  loading = false,
}: {
  title: string;
  description: string;
  data: DashboardChartDatum[];
  emptyLabel: string;
  loading?: boolean;
}) {
  const router = useRouter();
  const normalized = normalizeData(data);
  const total = normalized.reduce((sum, item) => sum + item.value, 0);

  const chartConfig: ChartConfig = {};
  normalized.forEach((item) => {
    chartConfig[item.label] = { label: item.label, color: item.color };
  });

  const handleClick = useCallback(
    (_: unknown, index: number) => {
      const target = normalized[index];
      if (target?.href) router.push(target.href);
    },
    [normalized, router],
  );

  return (
    <Card className="min-w-0">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid min-w-0 grid-cols-1 gap-3 p-3 pt-0 sm:grid-cols-[132px_minmax(0,1fr)]">
        {loading ? (
          <>
            <Skeleton className="size-28 rounded-full" />
            <ChartLegendSkeleton />
          </>
        ) : total ? (
          <>
            <div className="relative mx-auto size-28 shrink-0">
              <ChartContainer
                config={chartConfig}
                className="size-28"
                initialDimension={{ width: 112, height: 112 }}
              >
                <PieChart>
                  <Pie
                    data={normalized}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={handleClick}
                    style={{ cursor: normalized.some((d) => d.href) ? "pointer" : "default" }}
                  >
                    {normalized.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold leading-none tabular-nums">{total}</span>
                <span className="text-xs uppercase leading-none text-muted-foreground">total</span>
              </div>
            </div>
            <ChartLegend data={normalized} total={total} />
          </>
        ) : (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground sm:col-span-2">{emptyLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardBarChartCard({
  title,
  description,
  data,
  emptyLabel,
  loading = false,
  maxItems = 8,
}: {
  title: string;
  description: string;
  data: DashboardChartDatum[];
  emptyLabel: string;
  loading?: boolean;
  maxItems?: number;
}) {
  const router = useRouter();
  const normalized = normalizeData(data).slice(0, maxItems);
  const maxValue = Math.max(...normalized.map((item) => item.value), 0);

  return (
    <Card className="min-w-0">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
        {loading ? (
          <ChartLegendSkeleton />
        ) : normalized.length && maxValue ? (
          normalized.map((item, index) => {
            const color = item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
            const percent = Math.max((item.value / maxValue) * 100, 4);
            return (
              <div
                key={item.label}
                className="space-y-1"
                onClick={() => item.href && router.push(item.href)}
                role={item.href ? "button" : undefined}
                tabIndex={item.href ? 0 : undefined}
                onKeyDown={(e) => {
                  if (item.href && (e.key === "Enter" || e.key === " ")) router.push(item.href);
                }}
                style={{ cursor: item.href ? "pointer" : "default" }}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className={`truncate font-medium ${item.href ? "text-primary underline-offset-2 hover:underline" : ""}`}>{item.label}</span>
                  <span className="text-muted-foreground">{item.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })
        ) : (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">{emptyLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ChartLegend({ data, total }: { data: DashboardChartDatum[]; total: number }) {
  const router = useRouter();
  return (
    <div className="thin-scrollbar max-h-[120px] space-y-1.5 overflow-auto pr-1">
      {data.map((item, index) => {
        const color = item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
        const percent = total ? Math.round((item.value / total) * 100) : 0;
        return (
          <div
            key={item.label}
            className="flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1 text-xs"
            onClick={() => item.href && router.push(item.href)}
            role={item.href ? "button" : undefined}
            tabIndex={item.href ? 0 : undefined}
            onKeyDown={(e) => {
              if (item.href && (e.key === "Enter" || e.key === " ")) router.push(item.href);
            }}
            style={{ cursor: item.href ? "pointer" : "default" }}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <span className={`truncate ${item.href ? "text-primary underline-offset-2 hover:underline" : ""}`}>{item.label}</span>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{item.value} ({percent}%)</span>
          </div>
        );
      })}
    </div>
  );
}

function ChartLegendSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-full" />
      <Skeleton className="h-7 w-full" />
      <Skeleton className="h-7 w-3/4" />
    </div>
  );
}

function normalizeData(data: DashboardChartDatum[]) {
  return data
    .filter((item) => item.value > 0)
    .map((item, index) => ({
      ...item,
      color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }));
}
