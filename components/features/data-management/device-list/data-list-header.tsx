"use client";

import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DataListHeader({
  label,
  description,
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
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">{label} List</h2>
        <p className="text-sm text-muted-foreground">
          {description}
          {isRegionScoped ? " • Filter region aktif" : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {canCreateMaster ? (
          <Button type="button" onClick={onCreate}>
            <Plus className="mr-2 size-4" />
            Add {label}
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href={isMasterCategory ? "/master-data" : "/data-management"}>
            <ArrowLeft className="mr-2 size-4" />
            Kembali
          </Link>
        </Button>
      </div>
    </div>
  );
}
