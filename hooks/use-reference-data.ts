"use client";

import { useQuery } from "@tanstack/react-query";
import { getReferenceData, type ReferenceDataGroup } from "@/lib/api";
import { referenceDataKeys } from "@/lib/query-keys";

type UseReferenceDataOptions = {
  token?: string | null;
  groups?: ReferenceDataGroup[];
  regionId?: string | null;
  limit?: number;
  enabled?: boolean;
};

export function useReferenceData({
  token,
  groups,
  regionId,
  limit,
  enabled = true,
}: UseReferenceDataOptions) {
  return useQuery({
    queryKey: referenceDataKeys.list({ groups, scope: regionId, limit }),
    queryFn: () =>
      getReferenceData(token || "", {
        groups,
        regionId,
        limit,
      }),
    enabled: Boolean(enabled && token),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });
}
