"use client";

import { useEffect, useState } from "react";
import { AppLoading } from "@/components/app-loading-new";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SimpleTable } from "@/components/simple-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  apiFetch,
  type DashboardSummaryResponse,
  type DevicesListResponse,
  type PopsListResponse,
} from "@/lib/api";
import { useSession } from "@/components/session-context";

export default function DashboardPage() {
  const { token, me } = useSession();
  const [summary, setSummary] = useState<DashboardSummaryResponse["data"] | null>(null);
  const [pops, setPops] = useState<PopsListResponse["data"]>([]);
  const [devices, setDevices] = useState<DevicesListResponse["data"]>([]);
  const [popTotal, setPopTotal] = useState(0);
  const [deviceTotal, setDeviceTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      setLoading(true);
      const singleRegionScope =
        me.role === "user_region" && me.app_user.user_region_scopes?.length === 1
          ? me.app_user.user_region_scopes[0]?.region_id
          : "";
      const scopeQuery = singleRegionScope ? `&region_id=${encodeURIComponent(singleRegionScope)}` : "";
      const [summaryRes, popsRes, devicesRes] = await Promise.all([
        apiFetch<DashboardSummaryResponse>("/dashboard/summary", { token }),
        apiFetch<PopsListResponse>(`/pops?page=1&limit=5${scopeQuery}`, { token }),
        apiFetch<DevicesListResponse>(`/devices?page=1&limit=5${scopeQuery}`, { token }),
      ]);
      setSummary(summaryRes.data);
      setPops(popsRes.data || []);
      setDevices(devicesRes.data || []);
      setPopTotal(popsRes.meta?.total ?? popsRes.data?.length ?? 0);
      setDeviceTotal(devicesRes.meta?.total ?? devicesRes.data?.length ?? 0);
      setLoading(false);
    }
    void run();
  }, [token, me]);

  const isPopSynced = summary ? summary.pops === popTotal : true;
  const isDeviceSynced = summary ? summary.devices === deviceTotal : true;

  if (loading && !summary) {
    return (
      <ScrollArea className="h-full min-h-0 w-full">
        <div className="pr-3">
          <AppLoading label="Sedang memuat ringkasan dashboard..." />
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full min-h-0 w-full">
      <div className="space-y-4 pr-3">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Ringkasan asset sesuai scope region user. POP dan Device disinkronkan dengan endpoint list.
        </p>
      </div>

      {!isPopSynced || !isDeviceSynced ? (
        <Alert variant="destructive">
          <AlertTitle>Perlu Sinkronisasi Data</AlertTitle>
          <AlertDescription>
            Terdapat selisih antara `/dashboard/summary` dan data list. Cek backend summary query atau data index.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="POPs"
          value={popTotal}
          badge={isPopSynced ? "Synced" : "Mismatch"}
          badgeVariant={isPopSynced ? "outline" : "destructive"}
          loading={loading}
        />
        <StatCard
          label="Devices"
          value={deviceTotal}
          badge={isDeviceSynced ? "Synced" : "Mismatch"}
          badgeVariant={isDeviceSynced ? "outline" : "destructive"}
          loading={loading}
        />
        <StatCard
          label="Projects"
          value={summary?.projects ?? 0}
          badge="Summary"
          badgeVariant="outline"
          loading={loading}
        />
        <StatCard
          label="Customers"
          value={summary?.customers ?? 0}
          badge="Summary"
          badgeVariant="outline"
          loading={loading}
        />
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Latest POP</CardTitle>
            <CardDescription>5 data terbaru berdasarkan endpoint list POP.</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleTable
              headers={["POP ID", "Code", "Name", "Status"]}
              rows={pops.map((item) => [item.pop_id, item.pop_code, item.pop_name, item.status_pop])}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Device</CardTitle>
            <CardDescription>5 data terbaru berdasarkan endpoint list perangkat.</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleTable
              headers={["Device ID", "Name", "Type", "Status"]}
              rows={devices.map((item) => [item.device_id, item.device_name, item.device_type_key, item.status])}
            />
          </CardContent>
        </Card>
      </div>
      </div>
    </ScrollArea>
  );
}

function StatCard({
  label,
  value,
  badge,
  badgeVariant,
  loading = false,
}: {
  label: string;
  value: number;
  badge: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  loading?: boolean;
}) {
  return (
    <Card size="sm">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between gap-2">
          <CardDescription>{label}</CardDescription>
          {loading ? <Skeleton className="h-5 w-16 rounded-full" /> : <Badge variant={badgeVariant}>{badge}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-semibold">{value}</p>}
      </CardContent>
    </Card>
  );
}
