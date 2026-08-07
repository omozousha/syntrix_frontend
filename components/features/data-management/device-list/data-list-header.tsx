"use client";

import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DataListHeader({
  label,
  isRegionScoped,
  canCreateMaster,
  isMasterCategory,
  onCreate,
}: {
  label: string;
  description?: string;
  isRegionScoped: boolean;
  canCreateMaster: boolean;
  isMasterCategory: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 shadow-xs dark:bg-muted/5">
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Kontrol daftar</span>
        <span className="rounded border border-border/60 bg-background/60 px-2 py-0.5 text-xs text-muted-foreground">
          {isRegionScoped ? "Region scoped" : "All regions"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {canCreateMaster ? (
          <Button type="button" size="sm" onClick={onCreate}>
            <Plus className="mr-2 size-4" />
            Add {label}
          </Button>
        ) : null}
        <Button asChild variant="outline" size="sm">
          <Link href={isMasterCategory ? "/master-data" : "/data-management"}>
            <ArrowLeft className="mr-2 size-4" />
            Kembali
          </Link>
        </Button>
      </div>
    </div>
  );
}
