"use client";

import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { useTranslate } from "@/lib/use-locale";

export function OdpListSkeleton() {
  const { t } = useTranslate();
  return (
    <DataTableSkeleton
      columnCount={7}
      rowCount={8}
      showCheckbox={true}
      showMobileCards={true}
      ariaLabel={t("deviceList.loadingOdpAria")}
    />
  );
}
