"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { OperationalState } from "@/components/operational-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DataCategory } from "@/lib/data-management-config";
import { RegionCard, type RegionCoreSummary, type RegionItem } from "./region-card";
import { RegionInventoryDialog, type DeviceTypeOption } from "./region-inventory-dialog";

export function RegionCardGrid({
  regions,
  allRegionsCount,
  assetCategories,
  token,
  regionSummaryCache,
  regionSummaryLoadingIds,
  searchRegion,
  safeRegionPage,
  totalRegionPages,
  onSearchRegionChange,
  onPrevPage,
  onNextPage,
  formatDateTime,
  formatKilometers,
  latestDate,
}: {
  regions: RegionItem[];
  allRegionsCount: number;
  assetCategories: DataCategory[];
  token: string;
  regionSummaryCache: Record<string, RegionCoreSummary>;
  regionSummaryLoadingIds: Set<string>;
  searchRegion: string;
  safeRegionPage: number;
  totalRegionPages: number;
  onSearchRegionChange: (value: string) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  formatDateTime: (value?: string | null) => string;
  formatKilometers: (valueMeters: number) => string;
  latestDate: (...values: Array<string | null | undefined>) => string | null;
}) {
  const [selectedRegion, setSelectedRegion] = useState<RegionItem | null>(null);
  const deviceTypes = useMemo<DeviceTypeOption[]>(
    () =>
      assetCategories
        .filter((category) => category.resource === "devices" && category.deviceTypeKey)
        .map((category) => ({ value: category.deviceTypeKey || "", label: category.label })),
    [assetCategories],
  );

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Daftar Region</h3>
          <p className="text-xs text-muted-foreground">{regions.length} dari {allRegionsCount} region ditampilkan</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchRegion}
            onChange={(event) => onSearchRegionChange(event.target.value)}
            placeholder="Cari region..."
            className="pl-8"
          />
        </div>
      </div>

      {regions.length === 0 ? (
        <OperationalState
          title={allRegionsCount === 0 ? "Belum ada region" : "Region tidak ditemukan"}
          description={allRegionsCount === 0 ? "Belum ada data region yang bisa ditampilkan." : "Ubah kata kunci pencarian region."}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {regions.map((region) => {
              const summary = regionSummaryCache[region.id];
              return (
                <RegionCard
                  key={region.id}
                  region={region}
                  summary={summary}
                  loading={!summary || regionSummaryLoadingIds.has(region.id)}
                  onOpen={() => setSelectedRegion(region)}
                  formatDateTime={formatDateTime}
                  formatKilometers={formatKilometers}
                  latestDate={latestDate}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onPrevPage} disabled={safeRegionPage <= 1}>Sebelumnya</Button>
            <span className="text-xs text-muted-foreground">Halaman {safeRegionPage} / {totalRegionPages}</span>
            <Button type="button" variant="outline" size="sm" onClick={onNextPage} disabled={safeRegionPage >= totalRegionPages}>Berikutnya</Button>
          </div>
        </>
      )}

      <RegionInventoryDialog
        key={selectedRegion?.id || "no-region"}
        open={Boolean(selectedRegion)}
        region={selectedRegion}
        token={token}
        deviceTypes={deviceTypes}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedRegion(null);
        }}
      />
    </section>
  );
}
