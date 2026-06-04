import Link from "next/link";
import { OperationalState } from "@/components/operational-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
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
};

type RegionCategorySummary = Record<string, { total: number; latestUpdatedAt: string | null }>;

export function FocusedRegionCard({
  title,
  focusedRegion,
  regions,
  focusedRegionId,
  focusedRegionSummary,
  focusedRegionLoading,
  focusedRegionDetail,
  focusedRegionDetailLoading,
  focusedRegionLastUpdated,
  focusedAssetCategories,
  isAdminRegion,
  onFocusedRegionChange,
  formatDateTime,
  formatKilometers,
}: {
  title: string;
  focusedRegion: RegionItem | null;
  regions: RegionItem[];
  focusedRegionId: string;
  focusedRegionSummary?: RegionCoreSummary | null;
  focusedRegionLoading: boolean;
  focusedRegionDetail?: RegionCategorySummary | null;
  focusedRegionDetailLoading: boolean;
  focusedRegionLastUpdated?: string | null;
  focusedAssetCategories: DataCategory[];
  isAdminRegion: boolean;
  onFocusedRegionChange: (value: string) => void;
  formatDateTime: (value?: string | null) => string;
  formatKilometers: (valueMeters: number) => string;
}) {
  return (
    <section className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        {regions.length > 1 ? (
          <div className="w-full sm:w-80">
            <Combobox
              value={focusedRegionId}
              onValueChange={onFocusedRegionChange}
              options={regions.map((region) => ({
                value: region.id,
                label: `${region.region_name} (${region.region_id})`,
              }))}
            />
          </div>
        ) : null}
      </div>

      {!focusedRegion ? (
        <OperationalState title="Belum ada region" description="Akun ini belum memiliki scope region yang bisa ditampilkan." />
      ) : (
        <Card>
          <CardHeader className="space-y-1 px-3 py-3">
            <CardTitle className="flex items-start justify-between gap-2 text-sm">
              <span className="truncate">{focusedRegion.region_name}</span>
              <Badge variant="outline" className="text-[10px] uppercase">
                {focusedRegion.region_id}
              </Badge>
            </CardTitle>
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <p>
                POP {focusedRegionLoading ? "..." : focusedRegionSummary?.pops ?? 0} | Devices{" "}
                {focusedRegionLoading ? "..." : focusedRegionSummary?.devices ?? 0}
              </p>
              <p>
                Route {focusedRegionLoading ? "..." : formatKilometers(focusedRegionSummary?.routeDistanceMeters ?? 0)} | Cable on
                Route {focusedRegionLoading ? "..." : ` ${focusedRegionSummary?.cableDevices ?? 0}`}
              </p>
              <p>Update terakhir: {formatDateTime(focusedRegionLastUpdated)}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-3 pb-3 pt-0">
            <div className="grid grid-cols-3 gap-1.5">
              {focusedAssetCategories.map((category) => (
                <QuickCountButton
                  key={category.slug}
                  href={`/data-management/list/${category.slug}?region_id=${encodeURIComponent(focusedRegion.id)}`}
                  label={category.label}
                  value={focusedRegionDetailLoading ? undefined : focusedRegionDetail?.[category.slug]?.total ?? 0}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {isAdminRegion ? (
                <>
                  <RegionAction href="/requests" label="Approval Queue" />
                  <RegionAction href={`/data-management/list/odp?region_id=${encodeURIComponent(focusedRegion.id)}`} label="List ODP" />
                  <RegionAction href={`/data-management/odp-quality?region_id=${encodeURIComponent(focusedRegion.id)}`} label="ODP Quality" />
                </>
              ) : (
                <>
                  <RegionAction href={`/data-management/list/odp?region_id=${encodeURIComponent(focusedRegion.id)}`} label="Pilih ODP" />
                  <RegionAction href={`/data-management/odp-quality?region_id=${encodeURIComponent(focusedRegion.id)}`} label="Issue ODP" />
                  <RegionAction href={`/maps?region_id=${encodeURIComponent(focusedRegion.id)}`} label="Peta Region" />
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function RegionAction({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="outline" size="sm" className="justify-between">
      <Link href={href}>
        <span>{label}</span>
        <span>Open</span>
      </Link>
    </Button>
  );
}
