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
  checked,
  onCheckedChange,
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
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
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
      className={`min-w-0 border-b border-border/60 px-3 py-2.5 transition duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] last:border-b-0 ${
        selected ? "bg-primary/5 ring-1 ring-inset ring-primary/15" : "bg-background hover:bg-muted/40"
      }`}
    >
      <div className="flex items-start gap-2.5">
        {onCheckedChange && (
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 size-4 shrink-0 cursor-pointer rounded border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
            aria-label={`Pilih request ${title}`}
          />
        )}
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onSelect} className="w-full text-left active:scale-[0.99] transition-transform">
            <div className="grid min-w-0 gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <p className="min-w-0 break-words text-[13px] font-semibold leading-normal tracking-tight">{title || "-"}</p>
              <RequestTypeBadge kind={typeKind} label={typeLabel} className="max-w-full whitespace-normal break-words text-left font-mono text-[9px] uppercase tracking-normal" />
            </div>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
              <RequestStatusBadge status={status} className="font-mono text-[9px] uppercase" />
              <span className="min-w-0 break-words text-[11px] leading-relaxed text-muted-foreground">{summary}</span>
            </div>
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="max-w-full whitespace-normal break-words text-left font-mono text-[9px] uppercase tracking-normal">{ownerLabel}</Badge>
              <span className="min-w-0 break-words font-mono text-[10px] text-muted-foreground">Updated: {updatedAt}</span>
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
      </div>
    </div>
  );
}

export function RequestCardSkeleton() {
  return (
    <div className="border-b border-border/60 bg-background p-3 last:border-b-0">
      <div className="flex items-start gap-2.5">
        <Skeleton className="mt-1 size-4 shrink-0 rounded-sm" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
