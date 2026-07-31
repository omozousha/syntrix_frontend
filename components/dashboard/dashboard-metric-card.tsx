"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardMetricCard({
  label,
  value,
  caption,
  badge,
  tone = "neutral",
  icon: Icon,
  loading = false,
  trend,
}: {
  label: string;
  value: number | string;
  caption?: string;
  badge?: string;
  tone?: "neutral" | "blue" | "amber" | "red" | "green";
  icon?: LucideIcon;
  loading?: boolean;
  trend?: { direction: "up" | "down" | "flat"; label: string };
}) {
  const TrendIcon = trend?.direction === "up" ? ArrowUp : trend?.direction === "down" ? ArrowDown : Minus;
  const trendColor = trend?.direction === "up" ? "text-emerald-600 dark:text-emerald-400" : trend?.direction === "down" ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground";

  return (
    <Card className={`overflow-hidden border ${toneClassName(tone)}`}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium uppercase text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="mt-2 h-9 w-28" />
            ) : (
              <p className="mt-1 text-4xl font-bold leading-none tracking-tight">{value}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {Icon ? <Icon className="size-5 text-muted-foreground/70" /> : null}
            {badge ? <Badge variant={badgeVariant(tone)} className="text-[10px] leading-none">{badge}</Badge> : null}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          {trend ? (
            <span className={`inline-flex items-center gap-0.5 text-xs ${trendColor}`}>
              <TrendIcon className="size-3" />
              <span>{trend.label}</span>
            </span>
          ) : null}
          {caption ? <p className="line-clamp-2 text-xs text-muted-foreground">{trend ? "· " : ""}{caption}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function toneClassName(tone: "neutral" | "blue" | "amber" | "red" | "green") {
  if (tone === "blue") return "bg-blue-50/50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/60";
  if (tone === "amber") return "bg-amber-50/50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/60";
  if (tone === "red") return "bg-rose-50/50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/60";
  if (tone === "green") return "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/60";
  return "bg-card";
}

function badgeVariant(tone: "neutral" | "blue" | "amber" | "red" | "green") {
  if (tone === "red") return "destructive";
  if (tone === "green") return "secondary";
  return "outline";
}