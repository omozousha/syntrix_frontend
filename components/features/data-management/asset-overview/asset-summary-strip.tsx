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
    <section className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
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
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="px-3 py-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="px-3 py-3">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-1.5 px-3 pb-3 pt-0">
              {Array.from({ length: 4 }).map((__, cardIndex) => (
                <Skeleton key={cardIndex} className="h-8 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
