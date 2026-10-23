"use client";

import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export function OdpListSkeleton() {
  return (
    <DataTableSkeleton
      columnCount={7}
      rowCount={8}
      showCheckbox={true}
      showMobileCards={true}
      ariaLabel="Memuat daftar ODP..."
    />
  );
}
