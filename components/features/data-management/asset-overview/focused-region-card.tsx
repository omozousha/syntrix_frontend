import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Database,
  FileText,
  Globe,
  Layers,
  Map,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { OperationalState } from "@/components/operational-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import type { DataCategory } from "@/lib/data-management-config";
import { buildRegionCardDisplay } from "@/lib/display-adapters/asset-overview-display-adapter";
import { QuickCountButton } from "./quick-count-button";

type RegionItem = {
  id: string;
  region_name?: string | null;
  region_id?: string | null;
};

type RegionCategorySummary = Record<string, { total: number; latestUpdatedAt: string | null }>;

export function FocusedRegionCard({
  title,
  focusedRegion,
  regions,
  focusedRegionId,
  focusedRegionDetail,
  focusedRegionDetailLoading,
  focusedRegionLastUpdated,
  focusedAssetCategories,
  isAdminRegion,
  onFocusedRegionChange,
  formatDateTime,
}: {
  title: string;
  focusedRegion: RegionItem | null;
  regions: RegionItem[];
  focusedRegionId: string;
  focusedRegionDetail?: RegionCategorySummary | null;
  focusedRegionDetailLoading: boolean;
  focusedRegionLastUpdated?: string | null;
  focusedAssetCategories: DataCategory[];
  isAdminRegion: boolean;
  onFocusedRegionChange: (value: string) => void;
  formatDateTime: (value?: string | null) => string;
}) {
  const focusedDisplay = buildRegionCardDisplay(focusedRegion);

  return (
    <section className="space-y-3">
      {/* Section Header + Combobox */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Globe className="size-4 text-primary" />
          <h3 className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h3>
        </div>
        {regions.length > 1 ? (
          <div className="w-full sm:w-80">
            <Combobox
              value={focusedRegionId}
              onValueChange={onFocusedRegionChange}
              options={regions.map((region) => {
                const display = buildRegionCardDisplay(region);
                return {
                  value: region.id,
                  label: display.comboboxLabel,
                };
              })}
            />
          </div>
        ) : null}
      </div>

      {!focusedRegion ? (
        <OperationalState
          title="Belum ada region"
          description="Akun ini belum memiliki scope region yang bisa ditampilkan."
        />
      ) : (
        <div className="space-y-3">
          {/* Region Identity Bar — micro-bezel */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-2xs glass-inset">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-2xs">
                <MapPin className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight">{focusedDisplay.name}</p>
                {focusedRegionLastUpdated ? (
                  <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Update: {formatDateTime(focusedRegionLastUpdated)}
                  </p>
                ) : null}
              </div>
            </div>
            {focusedDisplay.code ? (
              <Badge variant="outline" className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] glass-inset">{focusedDisplay.code}</Badge>
            ) : null}
          </div>

          {/* Quick Actions — Role-aware */}
          <Card className="rounded-2xl border border-border/60 bg-card shadow-xs glass-inset" size="sm">
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-muted-foreground" />
                <CardTitle className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Quick Actions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {isAdminRegion ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <QuickActionCard
                    href="/requests"
                    label="Approval Queue"
                    description="Review & approve perubahan data"
                    icon={ClipboardList}
                    badge="Pending"
                    variant="default"
                  />
                  <QuickActionCard
                    href={`/data-management/list/odp?region_id=${encodeURIComponent(focusedRegion.id)}`}
                    label="List ODP"
                    description="Lihat dan kelola ODP per region"
                    icon={Map}
                    variant="outline"
                  />
                  <QuickActionCard
                    href={`/data-management/list/odp?validation_status=unvalidated&region_id=${encodeURIComponent(focusedRegion.id)}`}
                    label="ODP Unvalidated"
                    description="Pantau ODP belum valid"
                    icon={ShieldCheck}
                    variant="outline"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <QuickActionCard
                    href={`/data-management/list/odp?region_id=${encodeURIComponent(focusedRegion.id)}`}
                    label="Pilih ODP"
                    description="Pilih ODP untuk validasi lapangan"
                    icon={Map}
                    variant="default"
                  />
                  <QuickActionCard
                    href="/requests"
                    label="Requests"
                    description="Pantau request validasi"
                    icon={ShieldCheck}
                    variant="outline"
                  />
                  <QuickActionCard
                    href={`/maps?region_id=${encodeURIComponent(focusedRegion.id)}`}
                    label="Peta Region"
                    description="Visual aset berdasarkan peta"
                    icon={Globe}
                    variant="outline"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Asset by Category */}
          <Card size="sm">
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <Database className="size-4 text-muted-foreground" />
                <CardTitle className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Asset Inventory</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 xl:grid-cols-4">
                {focusedAssetCategories.map((category) => (
                  <QuickCountButton
                    key={category.slug}
                    href={`/data-management/list/${category.slug}?region_id=${encodeURIComponent(focusedRegion.id)}`}
                    label={category.label}
                    value={focusedRegionDetailLoading ? undefined : focusedRegionDetail?.[category.slug]?.total ?? 0}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Info Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/10 px-3.5 py-2.5 shadow-2xs glass-inset">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <FileText className="size-3" />
              <span>
                Total <strong className="font-mono tabular-nums text-foreground">{focusedAssetCategories.length}</strong> kategori aset terdaftar untuk region ini
              </span>
            </div>
            <Badge variant="secondary" className="font-mono text-[9px] uppercase tracking-[0.12em] glass-inset">
              {isAdminRegion ? "Admin Region" : "Validator Field"}
            </Badge>
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Sub-components ── */

function QuickActionCard({
  href,
  label,
  description,
  icon: Icon,
  badge,
  variant = "outline",
}: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  variant?: "default" | "outline";
}) {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="h-auto justify-between gap-3 rounded-2xl border border-border/60 bg-card p-3 text-left shadow-2xs glass-inset transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-primary/45 hover:bg-muted/15 active:scale-[0.98]"
    >
      <Link href={href}>
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/30 text-muted-foreground shadow-2xs">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{label}</span>
              {badge ? (
                <Badge variant="secondary" className="h-4 rounded-full px-1.5 font-mono text-[9px] uppercase tracking-[0.08em] tabular-nums">
                  {badge}
                </Badge>
              ) : null}
            </div>
            <p className="truncate font-mono text-[10px] text-muted-foreground">{description}</p>
          </div>
        </div>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    </Button>
  );
}
