"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search, Users } from "lucide-react";
import { InlineLoader } from "@/components/app-loading-new";
import { OperationalState } from "@/components/operational-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiFetch, type DevicesListResponse } from "@/lib/api";
import { deviceTypeKeyToSlug } from "@/lib/data-management-config";
import { useTranslate } from "@/lib/use-locale";
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
  const { t } = useTranslate();
  const [typeSearch, setTypeSearch] = useState("");
  const typeCountQuery = useQuery({
    queryKey: [...deviceKeys.all, "region-type-counts", region?.id || "", deviceTypes.map((item) => item.value).join(",")],
    queryFn: () => fetchDeviceTypeCounts(token, region?.id || "", deviceTypes),
    enabled: open && Boolean(region?.id) && deviceTypes.length > 0,
    staleTime: 60_000,
  });

  const customerCountQuery = useQuery({
    queryKey: ["region-customer-count", region?.id || ""],
    queryFn: async () => {
      const res = await apiFetch<{ meta?: { total: number }; data?: unknown[] }>(`/customers?page=1&limit=1&region_id=${encodeURIComponent(region?.id || "")}`, { token });
      return res.meta?.total ?? res.data?.length ?? 0;
    },
    enabled: open && Boolean(region?.id),
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
      <DialogContent className="flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] w-[calc(100%-1.5rem)] sm:w-[calc(100%-3rem)] max-w-6xl overflow-hidden rounded-2xl border border-border/60 p-0 shadow-lg glass-inset gap-0">
        <DialogHeader className="shrink-0 border-b border-border/50 px-4 py-3 sm:px-6 sm:py-4 pr-12 sm:pr-14">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-base sm:text-lg">{t("regionDialog.titlePrefix")} {display.name}</DialogTitle>
            {display.code ? <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-[0.12em] glass-inset">{display.code}</Badge> : null}
          </div>
          <DialogDescription className="text-xs sm:text-sm">{t("regionDialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="shrink-0 flex flex-col gap-2 px-4 py-3 sm:px-6 sm:flex-row sm:items-center sm:justify-between border-b border-border/30 bg-muted/5">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={typeSearch}
              onChange={(event) => setTypeSearch(event.target.value)}
              placeholder={t("regionDialog.searchPlaceholder")}
              className="h-9 rounded-full border-border/60 bg-card pl-9 text-xs shadow-2xs glass-inset"
            />
          </div>
          {typeCountQuery.isFetching ? (
            <InlineLoader label={t("regionDialog.countingDevice")} />
          ) : null}
        </div>

        {/* Customer Quick Summary Strip */}
        <div className="shrink-0 px-4 py-2 sm:px-6">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/60 bg-muted/10 p-3 glass-inset">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Users className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{t("regionDialog.regionCustomers")}</p>
                <p className="font-mono text-base font-bold tabular-nums text-foreground">
                  {customerCountQuery.isPending ? "..." : (customerCountQuery.data ?? 0).toLocaleString("id-ID")}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto rounded-full font-mono text-[10px] uppercase tracking-[0.08em] gap-1.5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
              onClick={() => {
                if (!region?.id) return;
                onOpenChange(false);
                router.push(`/data-management/list/customer?region_id=${encodeURIComponent(region.id)}`);
              }}
            >
              {t("regionDialog.viewCustomers")}
              <ArrowRight className="size-3" />
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 sm:px-6">
          <DeviceTypeOverview
            deviceTypes={visibleDeviceTypes}
            counts={typeCountQuery.data}
            loading={typeCountQuery.isPending}
            error={typeCountQuery.isError ? typeCountQuery.error : null}
            onRetry={() => typeCountQuery.refetch()}
            onSelect={openDeviceList}
          />
        </div>

        <div className="shrink-0 border-t border-border/60 bg-muted/30 px-4 py-2.5 sm:px-6 sm:py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground glass-inset">
          {typeCountQuery.isPending ? t("regionDialog.countingDevice") : t("regionDialog.footerCount", { total: totalRegionDevices.toLocaleString("id-ID"), count: deviceTypes.length })}
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
  const { t } = useTranslate();
  if (error) {
    return <OperationalState title={t("regionDialog.errorTitle")} description={error.message} variant="error" actionLabel={t("common.retry")} onAction={onRetry} />;
  }
  if (!deviceTypes.length) {
    return <OperationalState title={t("regionDialog.notFoundTitle")} description={t("regionDialog.notFoundDescription")} />;
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
