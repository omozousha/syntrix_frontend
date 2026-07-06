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
    description: "Standardisasi struktur region, klasifikasi POP, tipe route, dan layanan customer.",
    icon: Network,
    slugs: ["master-regions", "master-pop-types", "master-route-types", "master-service-types"],
  },
  {
    title: "Referensi Perangkat",
    description: "Referensi tipe perangkat, ODP, instalasi, model, dan splitter sebagai fondasi inventaris.",
    icon: Boxes,
    slugs: ["master-device-types", "master-odp-types", "master-cable-types", "master-core-capacities", "master-installation-types", "master-models", "master-splitter-profiles"],
  },
  {
    title: "Referensi Vendor & Tenant",
    description: "Master tenant, manufacturer, dan brand untuk memastikan naming kepemilikan serta vendor konsisten.",
    icon: Building2,
    slugs: ["master-tenants", "master-manufacturers", "master-brands"],
  },
  {
    title: "Referensi Lokasi",
    description: "Master provinsi dan kota/kabupaten untuk normalisasi data lokasi.",
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
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Akses Terbatas</CardTitle>
            <CardDescription>
              Halaman Master Data hanya tersedia untuk role admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/data-management">Kembali ke Data Management</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-5 pr-3">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 to-background">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="w-fit gap-1">
                  <BookMarked className="size-3.5" />
                  Pusat Master Data
                </Badge>
                <Badge variant="outline" className="w-fit">
                  Admin Only
                </Badge>
              </div>
              <AddDataMenu canCreatePop={false} canCreateDevice={false} canManageMaster />
            </div>
          </CardHeader>
          <CardContent>
            <MasterDataStatBar totalCategories={MASTER_DATA_CATEGORIES.length} totalItems={totalCatalogItems} />
          </CardContent>
        </Card>

        {loading ? <AppLoading label="Memuat ringkasan master data..." /> : null}
        {!loading && error ? <AppLoading label={error} variant="error" /> : null}

        {!loading && !error ? (
          <Tabs defaultValue="references" className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-2 sm:w-fit">
              <TabsTrigger value="references" className="min-h-10 px-3">
                Basis Data Referensi
              </TabsTrigger>
              <TabsTrigger value="qr-label" className="min-h-10 px-3">
                Konfigurasi Label QR
              </TabsTrigger>
            </TabsList>

            <TabsContent value="references" className="space-y-4">
              {failedCatalogs.length ? (
                <Card className="border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Beberapa Data Master Belum Tersedia</CardTitle>
                    <CardDescription>
                      Terjadi error saat membaca sebagian resource master data. Biasanya karena migrasi/metadata backend belum sinkron.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {failedCatalogs.map((item) => (
                      <div key={item.slug} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-xs text-muted-foreground">{item.reason}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
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
