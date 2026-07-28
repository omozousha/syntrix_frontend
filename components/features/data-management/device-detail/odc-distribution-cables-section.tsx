"use client";

import { useEffect, useState } from "react";
import { Cable, RefreshCw } from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, type PaginatedResponse } from "@/lib/api";

type CableRow = {
  id: string;
  route_type?: string | null;
  cable_type?: string | null;
  cable_length_m?: number | null;
  route_name?: string | null;
  sort_order?: number;
};

export function OdcDistributionCablesSection({
  deviceId,
  token,
}: {
  deviceId: string;
  token: string | null;
}) {
  const [cables, setCables] = useState<CableRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadCables() {
    if (!token) return;
    setLoading(true);
    try {
      const result = await apiFetch<PaginatedResponse<CableRow>>(
        `/odcDistributionCables?odc_device_id=${encodeURIComponent(deviceId)}&limit=100`,
        { token },
      );
      setCables(result.data || []);
    } catch {
      setCables([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCables();
  }, [deviceId, token]);

  if (loading) return <AppLoading label="Memuat kabel distribusi..." />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-3 py-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Cable className="size-4 text-muted-foreground" />
          Kabel Distribusi
        </CardTitle>
        <Button type="button" variant="ghost" size="icon" className="size-7" onClick={loadCables}>
          <RefreshCw className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3 pt-0">
        {cables.length === 0 ? (
          <p className="text-xs text-muted-foreground">Belum ada kabel distribusi tercatat.</p>
        ) : (
          cables.map((cable) => (
            <div key={cable.id} className="flex items-center gap-3 rounded-md border bg-muted/20 p-2 text-xs">
              <Badge variant="outline" className="shrink-0">
                {cable.route_type || "-"}
              </Badge>
              <span className="min-w-0 flex-1 truncate font-medium">{cable.cable_type || cable.route_name || "-"}</span>
              {cable.cable_length_m != null && (
                <span className="shrink-0 text-muted-foreground">{cable.cable_length_m} m</span>
              )}
              {cable.route_name && (
                <span className="shrink-0 text-muted-foreground">{cable.route_name}</span>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
