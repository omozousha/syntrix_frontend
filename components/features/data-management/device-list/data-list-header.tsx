"use client";

import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-card p-2.5 shadow-xs glass-inset">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] font-medium text-muted-foreground">Kontrol daftar</span>
        <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-[0.12em] border-border/60 bg-background/50">
          {isRegionScoped ? "Region scoped" : "All regions"}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {canCreateMaster ? (
          <Button type="button" size="sm" onClick={onCreate} className="group rounded-full pl-4 pr-1.5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
            Add {label}
            <span className="ml-2 flex size-6 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105 dark:bg-white/15">
              <Plus className="size-4" />
            </span>
          </Button>
        ) : null}
        <Button asChild variant="outline" size="sm" className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
          <Link href={isMasterCategory ? "/master-data" : "/data-management"}>
            <ArrowLeft className="mr-2 size-4" />
            Kembali
          </Link>
        </Button>
      </div>
    </div>
  );
}
