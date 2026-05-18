"use client";

import type { LucideIcon } from "lucide-react";
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
}: {
  label: string;
  value: number | string;
  caption?: string;
  badge?: string;
  tone?: "neutral" | "blue" | "amber" | "red" | "green";
  icon?: LucideIcon;
  loading?: boolean;
}) {
  return (
    <Card className={`overflow-hidden border ${toneClassName(tone)}`}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase text-muted-foreground">{label}</p>
            {loading ? <Skeleton className="mt-2 h-7 w-20" /> : <p className="mt-1 text-2xl font-semibold leading-none">{value}</p>}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
            {badge ? <Badge variant={badgeVariant(tone)} className="text-[10px]">{badge}</Badge> : null}
          </div>
        </div>
        {caption ? <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{caption}</p> : null}
      </CardContent>
    </Card>
  );
}

function toneClassName(tone: "neutral" | "blue" | "amber" | "red" | "green") {
  if (tone === "blue") return "bg-blue-50/50 border-blue-100";
  if (tone === "amber") return "bg-amber-50/50 border-amber-100";
  if (tone === "red") return "bg-rose-50/50 border-rose-100";
  if (tone === "green") return "bg-emerald-50/50 border-emerald-100";
  return "bg-card";
}

function badgeVariant(tone: "neutral" | "blue" | "amber" | "red" | "green") {
  if (tone === "red") return "destructive";
  if (tone === "green") return "secondary";
  return "outline";
}
