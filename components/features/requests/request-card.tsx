"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RequestStatusBadge } from "@/components/features/requests/request-status-badge";
import { RequestTypeBadge, type RequestTypeKind } from "@/components/features/requests/request-type-badge";

export function RequestCard({
  selected,
  title,
  typeKind,
  typeLabel,
  status,
  summary,
  ownerLabel,
  updatedAt,
  quickOpenHref,
  evidenceSlot,
  onSelect,
}: {
  selected: boolean;
  title: string;
  typeKind: RequestTypeKind;
  typeLabel: string;
  status?: string | null;
  summary: string;
  ownerLabel: string;
  updatedAt: string;
  quickOpenHref?: string | null;
  evidenceSlot?: ReactNode;
  onSelect: () => void;
}) {
  return (
    <div
      className={`min-w-0 border-b px-2 py-2 transition last:border-b-0 ${
        selected ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : "bg-background hover:bg-muted/40"
      }`}
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <p className="min-w-0 break-words text-[13px] font-semibold leading-4">{title || "-"}</p>
          <RequestTypeBadge kind={typeKind} label={typeLabel} className="max-w-full whitespace-normal break-words text-left text-[10px]" />
        </div>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1">
          <RequestStatusBadge status={status} className="text-[10px]" />
          <span className="min-w-0 break-words text-[11px] leading-4 text-muted-foreground">{summary}</span>
        </div>
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1">
          <Badge variant="outline" className="max-w-full whitespace-normal break-words text-left text-[10px]">{ownerLabel}</Badge>
          <span className="min-w-0 break-words text-[11px] text-muted-foreground">Updated: {updatedAt}</span>
        </div>
      </button>
      {quickOpenHref ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Button asChild type="button" size="sm" variant="outline" className="h-6 px-2 text-[11px]">
            <Link href={quickOpenHref}>Open Detail</Link>
          </Button>
        </div>
      ) : null}
      {evidenceSlot}
    </div>
  );
}

export function RequestCardSkeleton() {
  return (
    <div className="border-b bg-background p-2 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}
