"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookMarked, Boxes, Building2, MapPinned, Network } from "lucide-react";

import { AddDataMenu } from "@/components/add-data-menu";
import { AppLoading } from "@/components/app-loading-new";
import { QrLabelSettingsPanel } from "@/components/features/master-data/qr-label-settings-panel";
import { MasterDataReferenceSections, type FailedCatalog, type MasterDataSectionConfig } from "@/components/features/master-data/master-data-reference-sections";
import { MasterDataStatBar } from "@/components/features/master-data/master-data-stat-bar";
import { useSession } from "@/components/session-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch, type PaginatedResponse } from "@/lib/api";
import { MASTER_DATA_CATEGORIES } from "@/lib/data-management-config";

type GenericItem = { id: string };
type SummaryBySlug = Record<string, number>;

const MASTER_SECTIONS: MasterDataSectionConfig[] = [
  {
    title: "Referensi Topologi",
    icon: Network,
    slugs: ["master-regions", "master-pop-types", "master-route-types", "master-service-types"],
  },
  {
    title: "Referensi Perangkat",
    icon: Boxes,
    slugs: ["master-device-types", "master-odp-types", "master-cable-types", "master-closure-types", "master-core-capacities", "master-device-core-capacities", "master-installation-types", "master-models", "master-splitter-profiles"],
  },
  {
    title: "Referensi Vendor & Tenant",
    icon: Building2,
    slugs: ["master-tenants", "master-manufacturers", "master-brands"],
  },
  {
    title: "Referensi Lokasi",
    icon: MapPinned,
    slugs: ["master-provinces", "master-cities"],
  },
];

export default function MasterDataPage() {
  const { token, me } = useSession();
  const [summaryBySlug, setSummaryBySlug] = useState<SummaryBySlug>({});
  const [failedCatalogs, setFailedCatalogs] = useState<FailedCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");
      try {
        const responses = await Promise.allSettled(
          MASTER_DATA_CATEGORIES.map((category) =>
            apiFetch<PaginatedResponse<GenericItem>>(`/${category.resource}?page=1&limit=1`, { token }),
          ),
        );
        if (cancelled) return;

        const nextSummary: SummaryBySlug = {};
        const nextFailed: FailedCatalog[] = [];
        MASTER_DATA_CATEGORIES.forEach((category, index) => {
          const result = responses[index];
          if (result.status === "fulfilled") {
            nextSummary[category.slug] = result.value.meta?.total ?? result.value.data?.length ?? 0;
            return;
          }
          nextSummary[category.slug] = 0;
          nextFailed.push({
            slug: category.slug,
            label: category.label,
            reason: result.reason instanceof Error ? result.reason.message : "Unknown error",
          });
        });
        setSummaryBySlug(nextSummary);
        setFailedCatalogs(nextFailed);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || "Gagal memuat ringkasan master data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const totalCatalogItems = useMemo(
    () => MASTER_DATA_CATEGORIES.reduce((acc, category) => acc + (summaryBySlug[category.slug] || 0), 0),
    [summaryBySlug],
  );

  if (me.role !== "admin") {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md rounded-2xl border border-border/60 bg-card p-2 shadow-xs glass-inset">
          <CardHeader>
            <CardTitle>Akses Terbatas</CardTitle>
            <CardDescription>Halaman Master Data hanya tersedia untuk role admin.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
              <Link href="/data-management">Kembali ke Data Management</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 pr-3 pb-8">
        {/* Header Eyebrow & Title */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">SYSTEM / MASTER REPOSITORIES</p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Katalog Master Data</h1>
            <p className="text-xs text-muted-foreground">
              Pusat referensi topologi, perangkat, vendor, dan lokasi untuk seluruh inventori jaringan Syntrix.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-mono text-[9px] uppercase tracking-[0.12em]">
              <BookMarked className="mr-1 size-3" />
              Pusat Master Data
            </Badge>
            <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-[0.12em]">
              Admin Only
            </Badge>
            <AddDataMenu canCreatePop={false} canCreateDevice={false} canManageMaster />
          </div>
        </div>

        {/* Double-Bezel Metric Summary */}
        <MasterDataStatBar
          totalItems={totalCatalogItems}
          totalCategories={MASTER_DATA_CATEGORIES.length}
          failedCount={failedCatalogs.length}
        />

        {loading ? <AppLoading label="Memuat ringkasan master data..." /> : null}
        {!loading && error ? <AppLoading label={error} variant="error" /> : null}

        {!loading && !error ? (
          <Tabs defaultValue="references" className="space-y-4">
            <TabsList className="inline-flex h-auto rounded-full border border-border/50 bg-muted/20 p-1">
              <TabsTrigger
                value="references"
                className="rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
              >
                Basis Data Referensi
              </TabsTrigger>
              <TabsTrigger
                value="qr-label"
                className="rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
              >
                Konfigurasi Label QR
              </TabsTrigger>
            </TabsList>

            <TabsContent value="references" className="space-y-4">
              {failedCatalogs.length ? (
                <div className="rounded-2xl border border-amber-300/60 bg-amber-50/50 p-4 shadow-xs glass-inset dark:bg-amber-950/10">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] font-semibold text-amber-700 dark:text-amber-400">Peringatan Sinkronisasi</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Terjadi error saat membaca sebagian resource master data. Biasanya karena migrasi/metadata backend belum sinkron.
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {failedCatalogs.map((item) => (
                      <div key={item.slug} className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-card px-3 py-2 text-sm">
                        <span className="font-medium">{item.label}</span>
                        <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-[0.12em]">{item.reason}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <MasterDataReferenceSections
                sections={MASTER_SECTIONS}
                categories={MASTER_DATA_CATEGORIES}
                summaryBySlug={summaryBySlug}
                failedCatalogs={failedCatalogs}
              />
            </TabsContent>

            <TabsContent value="qr-label" className="space-y-4">
              <QrLabelSettingsPanel token={token} />
            </TabsContent>
          </Tabs>
        ) : null}
      </div>
    </ScrollArea>
  );
}
