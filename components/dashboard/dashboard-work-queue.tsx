"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type DashboardQueueItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  badge?: string;
  tone?: "neutral" | "blue" | "amber" | "red" | "green";
  onApprove?: () => Promise<void>;
  onReject?: () => Promise<void>;
  actionLoading?: boolean;
};

export function DashboardWorkQueue({
  title,
  description,
  items,
  emptyLabel,
  icon: Icon,
  loading = false,
}: {
  title: string;
  description: string;
  items: DashboardQueueItem[];
  emptyLabel: string;
  icon?: LucideIcon;
  loading?: boolean;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              {Icon ? <Icon className="size-4" /> : null}
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="outline">{loading ? "-" : items.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-md border p-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-full" />
            </div>
          ))
        ) : items.length ? (
          items.slice(0, 6).map((item) => (
<div key={item.id} className="flex min-w-0 items-start justify-between gap-3 rounded-md border bg-background p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    {item.badge ? <Badge variant={badgeVariant(item.tone)} className="text-[10px]">{item.badge}</Badge> : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                  {item.onApprove || item.onReject ? (
                    <div className="mt-2 flex items-center gap-2">
                      {item.onApprove ? (
                        <button
                          type="button"
                          disabled={item.actionLoading}
                          onClick={item.onApprove}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                        >
                          {item.actionLoading ? "..." : "Setujui"}
                        </button>
                      ) : null}
                      {item.onReject ? (
                        <button
                          type="button"
                          disabled={item.actionLoading}
                          onClick={item.onReject}
                          className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-[10px] font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/50"
                        >
                          {item.actionLoading ? "..." : "Tolak"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-start gap-1">
                  <Button asChild variant="ghost" size="icon" className="size-8">
                    <Link href={item.href} aria-label={`Open ${item.title}`}>
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">{emptyLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

function badgeVariant(tone?: "neutral" | "blue" | "amber" | "red" | "green") {
  if (tone === "red") return "destructive";
  if (tone === "green") return "secondary";
  return "outline";
}
