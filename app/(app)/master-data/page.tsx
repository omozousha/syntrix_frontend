"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookMarked, Boxes, Building2, ChevronRight, MapPinned, Network, Workflow } from "lucide-react";
import { AddDataMenu } from "@/components/add-data-menu";
import { AppLoading } from "@/components/app-loading-new";
import { useSession } from "@/components/session-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch, type PaginatedResponse } from "@/lib/api";
import { MASTER_DATA_CATEGORIES } from "@/lib/data-management-config";

type GenericItem = { id: string };

type SummaryBySlug = Record<string, number>;
type FailedCatalog = { slug: string; label: string; reason: string };

const MASTER_SECTIONS: Array<{
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  slugs: string[];
}> = [
  {
    title: "Referensi Topologi",
    description: "Standardisasi struktur region, klasifikasi POP, dan tipe route untuk seluruh operasi.",
    icon: Network,
    slugs: ["master-regions", "master-pop-types", "master-route-types"],
  },
  {
    title: "Referensi Perangkat",
    description: "Referensi tipe perangkat, ODP, instalasi, model, dan splitter sebagai fondasi inventaris.",
    icon: Boxes,
    slugs: ["master-device-types", "master-odp-types", "master-installation-types", "master-models", "master-splitter-profiles"],
  },
  {
    title: "Referensi Vendor",
    description: "Master manufacturer dan brand untuk memastikan naming konsisten.",
    icon: Building2,
    slugs: ["master-manufacturers", "master-brands"],
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
              <div className="space-y-2">
                <CardTitle className="text-2xl">Tata Kelola Master Data</CardTitle>
                <Badge variant="secondary" className="w-fit gap-1">
                  <BookMarked className="size-3.5" />
                  Pusat Master Data
                </Badge>
              </div>
              <AddDataMenu canCreatePop={false} canCreateDevice={false} canManageMaster />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatCard
                label="Total Master Data"
                value={String(MASTER_DATA_CATEGORIES.length)}
                hint="Jenis referensi"
                icon={<Workflow className="size-4" />}
              />
              <StatCard
                label="Total Data"
                value={String(totalCatalogItems)}
                hint="Seluruh item master"
                icon={<Boxes className="size-4" />}
              />
              <StatCard
                label="Kelompok Data"
                value="4"
                hint="Topologi, Perangkat, Vendor, Lokasi"
                icon={<Network className="size-4" />}
              />
              <StatCard
                label="Akses Kelola"
                value="Admin"
                hint="Hak perubahan data"
                icon={<BookMarked className="size-4" />}
              />
            </div>
          </CardContent>
        </Card>

        {loading ? <AppLoading label="Memuat ringkasan master data..." /> : null}
        {!loading && error ? <AppLoading label={error} variant="error" /> : null}

        {!loading && !error ? (
          <>
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

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {MASTER_SECTIONS.map((section) => {
                const categories = MASTER_DATA_CATEGORIES.filter((item) => section.slugs.includes(item.slug));
                return (
                  <Card key={section.title} className="border-border/70">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-2">
                        <div className="rounded-md bg-primary/10 p-2 text-primary">
                          <section.icon className="size-4" />
                        </div>
                        <div className="space-y-1">
                          <CardTitle className="text-base">{section.title}</CardTitle>
                          <CardDescription>{section.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0">
                      {categories.map((category) => {
                        const failedItem = failedCatalogs.find((item) => item.slug === category.slug);
                        return (
                          <div key={category.slug} className="flex items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{category.label}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {failedItem ? `Error: ${failedItem.reason}` : category.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={failedItem ? "outline" : "secondary"}>
                                {failedItem ? "N/A" : summaryBySlug[category.slug] ?? 0}
                              </Badge>
                              <Button asChild size="sm" variant="outline" disabled={Boolean(failedItem)}>
                                <Link href={`/data-management/list/${category.slug}`}>
                                  Open
                                  <ChevronRight className="ml-1 size-3.5" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </ScrollArea>
  );
}
function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="bg-background/80 shadow-none">
      <CardContent className="px-3 py-2.5">
        <div className="mb-2 flex items-center justify-between text-muted-foreground">
          <span className="text-[11px] uppercase tracking-wide">{label}</span>
          {icon}
        </div>
        <p className="text-xl font-semibold">{value}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
