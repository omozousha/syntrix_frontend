"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { OperationalState } from "@/components/operational-ui";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiFetch, type DevicesListResponse } from "@/lib/api";
import { deviceTypeKeyToSlug } from "@/lib/data-management-config";
import { buildRegionCardDisplay } from "@/lib/display-adapters/asset-overview-display-adapter";
import { deviceKeys } from "@/lib/query-keys";
import { RegionDeviceTypeCard } from "./region-device-type-card";
import type { RegionItem } from "./region-card";

export type DeviceTypeOption = {
  value: string;
  label: string;
};

export function RegionInventoryDialog({
  open,
  region,
  token,
  deviceTypes,
  onOpenChange,
}: {
  open: boolean;
  region: RegionItem | null;
  token: string;
  deviceTypes: DeviceTypeOption[];
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [typeSearch, setTypeSearch] = useState("");
  const typeCountQuery = useQuery({
    queryKey: [...deviceKeys.all, "region-type-counts", region?.id || "", deviceTypes.map((item) => item.value).join(",")],
    queryFn: () => fetchDeviceTypeCounts(token, region?.id || "", deviceTypes),
    enabled: open && Boolean(region?.id) && deviceTypes.length > 0,
    staleTime: 60_000,
  });

  const visibleDeviceTypes = useMemo(() => {
    const keyword = typeSearch.trim().toLowerCase();
    if (!keyword) return deviceTypes;
    return deviceTypes.filter((item) => item.label.toLowerCase().includes(keyword) || item.value.toLowerCase().includes(keyword));
  }, [deviceTypes, typeSearch]);

  const totalRegionDevices = Object.values(typeCountQuery.data || {}).reduce((sum, count) => sum + count, 0);
  const display = buildRegionCardDisplay(region);

  function openDeviceList(option: DeviceTypeOption) {
    if (!region?.id) return;
    onOpenChange(false);
    router.push(`/data-management/list/${deviceTypeKeyToSlug(option.value)}?region_id=${encodeURIComponent(region.id)}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[calc(100dvh-1.5rem)] max-w-6xl grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden p-0">
        <DialogHeader className="border-b px-5 pb-4 pt-5 pr-14">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-lg">Inventory Device {display.name}</DialogTitle>
            {display.code ? <Badge variant="outline">{display.code}</Badge> : null}
          </div>
          <DialogDescription>Pilih tipe device untuk membuka halaman daftar inventory pada region terkait.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 px-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={typeSearch}
              onChange={(event) => setTypeSearch(event.target.value)}
              placeholder="Cari tipe device..."
              className="pl-8"
            />
          </div>
          {typeCountQuery.isFetching ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Menghitung device...
            </div>
          ) : null}
        </div>

        <div className="min-h-0 overflow-y-auto px-5">
          <DeviceTypeOverview
            deviceTypes={visibleDeviceTypes}
            counts={typeCountQuery.data}
            loading={typeCountQuery.isPending}
            error={typeCountQuery.isError ? typeCountQuery.error : null}
            onRetry={() => typeCountQuery.refetch()}
            onSelect={openDeviceList}
          />
        </div>

        <div className="border-t bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
          {typeCountQuery.isPending ? "Menghitung device..." : `${totalRegionDevices.toLocaleString("id-ID")} device dalam ${deviceTypes.length} tipe`}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeviceTypeOverview({
  deviceTypes,
  counts,
  loading,
  error,
  onRetry,
  onSelect,
}: {
  deviceTypes: DeviceTypeOption[];
  counts?: Record<string, number>;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onSelect: (option: DeviceTypeOption) => void;
}) {
  if (error) {
    return <OperationalState title="Jumlah device gagal dimuat" description={error.message} variant="error" actionLabel="Coba lagi" onAction={onRetry} />;
  }
  if (!deviceTypes.length) {
    return <OperationalState title="Tipe device tidak ditemukan" description="Ubah kata kunci pencarian tipe device." />;
  }
  return (
    <div className="grid grid-cols-1 gap-3 pb-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {deviceTypes.map((option) => (
        <RegionDeviceTypeCard
          key={option.value}
          label={option.label}
          deviceTypeKey={option.value}
          count={loading ? undefined : counts?.[option.value] ?? 0}
          onOpen={() => onSelect(option)}
        />
      ))}
    </div>
  );
}

async function fetchDeviceTypeCounts(token: string, regionId: string, deviceTypes: DeviceTypeOption[]) {
  const entries = await Promise.all(
    deviceTypes.map(async (option) => {
      const query = new URLSearchParams({
        page: "1",
        limit: "1",
        region_id: regionId,
        device_type_key: option.value,
      });
      const response = await apiFetch<DevicesListResponse>(`/devices?${query.toString()}`, { token });
      return [option.value, response.meta?.total ?? response.data.length] as const;
    }),
  );
  return Object.fromEntries(entries);
}
