"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <div className={`rounded-md border p-2.5 transition ${selected ? "border-primary bg-primary/5" : "bg-background hover:bg-muted/40"}`}>
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm font-medium">{title || "-"}</p>
          <RequestTypeBadge kind={typeKind} label={typeLabel} className="text-[10px]" />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <RequestStatusBadge status={status} className="text-[10px]" />
          <span className="text-xs text-muted-foreground">{summary}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">{ownerLabel}</Badge>
          <span className="text-[11px] text-muted-foreground">Updated: {updatedAt}</span>
        </div>
      </button>
      {quickOpenHref ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button asChild type="button" size="sm" variant="outline" className="h-6 px-2 text-[11px]">
            <Link href={quickOpenHref}>Open Detail</Link>
          </Button>
        </div>
      ) : null}
      {evidenceSlot}
    </div>
  );
}
