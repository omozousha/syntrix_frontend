"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { OdpListSummary, OdpPopSummary } from "@/lib/types/odp-summary";

interface OdpSummaryResponse {
  odp: OdpListSummary;
  pops: OdpPopSummary[];
}

interface UseOdpSummaryOptions {
  regionScopeId?: string | null;
  popId?: string | null;
  projectId?: string | null;
  token?: string | undefined;
  enabled?: boolean;
}

export function useOdpSummary({
  regionScopeId,
  popId,
  projectId,
  token,
  enabled = true,
}: UseOdpSummaryOptions) {
  const [data, setData] = useState<OdpSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        const queryParams = new URLSearchParams();
        
        if (regionScopeId) {
          queryParams.set("region_id", regionScopeId);
        }
        
        if (popId) {
          queryParams.set("pop_id", popId);
        }
        
        if (projectId) {
          queryParams.set("project_id", projectId);
        }
        
        const queryString = queryParams.toString();
        const path = `/dashboard/odp-summary${queryString ? `?${queryString}` : ""}`;
        
        const result = await apiFetch<{ data: OdpSummaryResponse }>(path, { token });
        
        if (!cancelled && result?.data) {
          setData(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || "Gagal memuat ringkasan ODP");
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [regionScopeId, popId, projectId, token, enabled]);

  return { data, loading, error };
}

export default useOdpSummary;
