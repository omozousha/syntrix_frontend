import { ChevronDown } from "lucide-react";
import { OperationalState } from "@/components/operational-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import type { DataCategory } from "@/lib/data-management-config";
import { QuickCountButton } from "./quick-count-button";

type RegionItem = {
  id: string;
  region_name?: string | null;
  region_id?: string | null;
};

type RegionCoreSummary = {
  pops: number;
  routes: number;
  routeDistanceMeters: number;
  cableDevices: number;
  projects: number;
  devices: number;
  popLatestUpdatedAt: string | null;
  deviceLatestUpdatedAt: string | null;
  routeLatestUpdatedAt: string | null;
};

type RegionCategorySummary = Record<string, { total: number; latestUpdatedAt: string | null }>;

export function RegionCardGrid({
  regions,
  allRegionsCount,
  assetCategories,
  regionSummaryCache,
  regionSummaryLoadingIds,
  regionDetailsCache,
  regionDetailsLoadingIds,
  openRegionIds,
  searchRegion,
  safeRegionPage,
  totalRegionPages,
  onSearchRegionChange,
  onRegionOpenChange,
  onPrevPage,
  onNextPage,
  formatDateTime,
  formatKilometers,
  latestDate,
}: {
  regions: RegionItem[];
  allRegionsCount: number;
  assetCategories: DataCategory[];
  regionSummaryCache: Record<string, RegionCoreSummary>;
  regionSummaryLoadingIds: Set<string>;
  regionDetailsCache: Record<string, RegionCategorySummary>;
  regionDetailsLoadingIds: Set<string>;
  openRegionIds: Set<string>;
  searchRegion: string;
  safeRegionPage: number;
  totalRegionPages: number;
  onSearchRegionChange: (value: string) => void;
  onRegionOpenChange: (regionId: string, open: boolean) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  formatDateTime: (value?: string | null) => string;
  formatKilometers: (valueMeters: number) => string;
  latestDate: (...values: Array<string | null | undefined>) => string | null;
}) {
  return (
    <section className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Region Cards</h3>
        <div className="w-full sm:w-72">
          <Input value={searchRegion} onChange={(event) => onSearchRegionChange(event.target.value)} placeholder="Search region..." />
        </div>
      </div>

      {regions.length === 0 ? (
        <OperationalState
          title={allRegionsCount === 0 ? "Belum ada region" : "Region tidak ditemukan"}
          description={
            allRegionsCount === 0
              ? "Akun ini belum memiliki data region yang bisa ditampilkan."
              : "Coba gunakan kata kunci region lain atau reset pencarian."
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-4">
            {regions.map((region) => {
              const summary = regionSummaryCache[region.id];
              const isLoadingCard = regionSummaryLoadingIds.has(region.id) && !summary;
              const isOpen = openRegionIds.has(region.id);
              const regionDetail = regionDetailsCache[region.id];
              const regionDetailLoading = regionDetailsLoadingIds.has(region.id) && !regionDetail;
              const regionLastUpdated = latestDate(summary?.popLatestUpdatedAt, summary?.deviceLatestUpdatedAt, summary?.routeLatestUpdatedAt);

              return (
                <Collapsible key={region.id} open={isOpen} onOpenChange={(nextOpen) => onRegionOpenChange(region.id, nextOpen)}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <Button type="button" variant="ghost" className="h-auto w-full justify-start p-0 text-left hover:bg-transparent">
                        <CardHeader className="w-full space-y-1 px-3 py-3">
                          <CardTitle className="flex items-start justify-between gap-2 text-sm">
                            <span className="truncate">{region.region_name}</span>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-[10px] uppercase">
                                {region.region_id}
                              </Badge>
                              <ChevronDown className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                            </div>
                          </CardTitle>
                          <div className="space-y-1 text-[11px] text-muted-foreground">
                            <p>
                              POP {isLoadingCard ? "..." : summary?.pops ?? 0} | Devices {isLoadingCard ? "..." : summary?.devices ?? 0}
                            </p>
                            <p>
                              Route {isLoadingCard ? "..." : formatKilometers(summary?.routeDistanceMeters ?? 0)} | Cable on Route{" "}
                              {isLoadingCard ? "..." : summary?.cableDevices ?? 0}
                            </p>
                            <p>Update terakhir: {formatDateTime(regionLastUpdated)}</p>
                          </div>
                        </CardHeader>
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="space-y-2 px-3 pb-3 pt-0">
                        <div className="grid grid-cols-2 gap-1.5">
                          {assetCategories.map((category) => (
                            <QuickCountButton
                              key={category.slug}
                              href={`/data-management/list/${category.slug}?region_id=${encodeURIComponent(region.id)}`}
                              label={category.label}
                              value={regionDetailLoading ? undefined : regionDetail?.[category.slug]?.total ?? 0}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onPrevPage} disabled={safeRegionPage <= 1}>
              Prev
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {safeRegionPage} / {totalRegionPages}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={onNextPage} disabled={safeRegionPage >= totalRegionPages}>
              Next
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
