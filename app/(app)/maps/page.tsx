"use client";

import { useEffect, useState } from "react";
import { AppLoading } from "@/components/app-loading-new";
import { SimpleTable } from "@/components/simple-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/components/session-context";
import { apiFetch, type PopsListResponse } from "@/lib/api";

export default function MapsPage() {
  const { token, me } = useSession();
  const [pops, setPops] = useState<PopsListResponse["data"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");
      try {
        const singleRegionScope =
          me.role === "user_region" && me.app_user.user_region_scopes?.length === 1
            ? me.app_user.user_region_scopes[0]?.region_id
            : "";
        const scopeQuery = singleRegionScope ? `&region_id=${encodeURIComponent(singleRegionScope)}` : "";
        const result = await apiFetch<PopsListResponse>(`/pops?page=1&limit=20${scopeQuery}`, { token });
        if (cancelled) return;
        setPops(result.data || []);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || "Gagal memuat data maps.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [token, me]);

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 pr-3">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Maps</h2>
        <p className="text-sm text-muted-foreground">Klik POP untuk membuka pencarian di OpenStreetMap.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>POP Map Links</CardTitle>
          <CardDescription>List POP yang bisa dibuka langsung di OpenStreetMap.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <AppLoading label="Sedang memuat data POP untuk peta..." />
          ) : error ? (
            <AppLoading label={error} />
          ) : (
            <SimpleTable
              headers={["POP", "Status", "OpenStreetMap"]}
              rows={pops.map((item) => [
                item.pop_name,
                item.status_pop,
                <a
                  key={item.id}
                  href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(item.pop_name)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Open Map
                </a>,
              ])}
            />
          )}
        </CardContent>
      </Card>
      </div>
    </ScrollArea>
  );
}
