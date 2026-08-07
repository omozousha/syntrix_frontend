import type { LucideIcon } from "lucide-react";
import { OperationalKpiCard } from "@/components/operational-ui";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type AssetSummaryStat = {
  key: string;
  label: string;
  value: string | number;
  caption?: string;
  icon: LucideIcon;
  tone: "blue" | "emerald" | "amber" | "rose" | "slate";
};

export function AssetSummaryStrip({
  title,
  stats,
}: {
  title: string;
  stats: AssetSummaryStat[];
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-3.5 shadow-xs dark:bg-muted/10">
      <div className="flex items-center justify-between gap-3 px-0.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        <span className="font-mono text-xs text-muted-foreground/80">{stats.length} metrics</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
        {stats.map((stat) => (
          <OperationalKpiCard
            key={stat.key}
            label={stat.label}
            value={stat.value}
            caption={stat.caption}
            icon={stat.icon}
            tone={stat.tone}
          />
        ))}
      </div>
    </section>
  );
}

export function AssetSummaryLoading() {
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-3.5 dark:bg-muted/10">
      <div className="flex items-center justify-between px-0.5">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-3.5 w-14" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
