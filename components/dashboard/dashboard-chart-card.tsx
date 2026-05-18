"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type DashboardChartDatum = {
  label: string;
  value: number;
  color?: string;
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
  const normalized = normalizeData(data);
  const total = normalized.reduce((sum, item) => sum + item.value, 0);
  const background = total ? buildConicGradient(normalized) : "#e5e7eb";

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
            <div className="relative mx-auto size-28 shrink-0 rounded-full" style={{ background }}>
              <div className="absolute inset-5 rounded-full bg-card" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold">{total}</span>
                <span className="text-[10px] uppercase text-muted-foreground">total</span>
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
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium">{item.label}</span>
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
  return (
    <div className="space-y-1.5">
      {data.map((item, index) => {
        const color = item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
        const percent = total ? Math.round((item.value / total) * 100) : 0;
        return (
          <div key={item.label} className="flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1.5 text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="truncate">{item.label}</span>
            </div>
            <span className="shrink-0 text-muted-foreground">{item.value} ({percent}%)</span>
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

function buildConicGradient(data: DashboardChartDatum[]) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const segments = data.map((item, index) => {
    const color = item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    const start = cursor;
    const size = (item.value / total) * 360;
    cursor += size;
    return `${color} ${start}deg ${cursor}deg`;
  });
  return `conic-gradient(${segments.join(", ")})`;
}
