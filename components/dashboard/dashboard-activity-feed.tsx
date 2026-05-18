"use client";

import Link from "next/link";
import { Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type DashboardActivityItem = {
  id: string;
  title: string;
  description: string;
  timestamp?: string | null;
  href?: string;
};

export function DashboardActivityFeed({
  title,
  description,
  items,
  emptyLabel,
  loading = false,
}: {
  title: string;
  description: string;
  items: DashboardActivityItem[];
  emptyLabel: string;
  loading?: boolean;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock3 className="size-4" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-md border p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-full" />
            </div>
          ))
        ) : items.length ? (
          items.slice(0, 6).map((item) => {
            const content = (
              <div className="rounded-md border bg-background p-3 transition-colors hover:bg-muted/40">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.timestamp ? <Badge variant="outline" className="text-[10px]">{formatDateTime(item.timestamp)}</Badge> : null}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
              </div>
            );

            return item.href ? (
              <Link key={item.id} href={item.href} className="block">
                {content}
              </Link>
            ) : (
              <div key={item.id}>{content}</div>
            );
          })
        ) : (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">{emptyLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
