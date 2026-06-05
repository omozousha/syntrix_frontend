"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch, type DevicesListResponse } from "@/lib/api";
import { deviceKeys } from "@/lib/query-keys";

export type DeviceDetailResponse = {
  success: boolean;
  message: string;
  data: Record<string, unknown> & { id: string };
};

type UseDeviceDetailOptions = {
  token?: string | null;
  id?: string | null;
  enabled?: boolean;
};

type UseDeviceListOptions = {
  token?: string | null;
  slug?: string | null;
  page?: number;
  limit?: number;
  filters?: Record<string, string | number | boolean | null | undefined>;
  enabled?: boolean;
};

export function useDeviceDetail({ token, id, enabled = true }: UseDeviceDetailOptions) {
  return useQuery({
    queryKey: deviceKeys.detail(id || ""),
    queryFn: () => apiFetch<DeviceDetailResponse>(`/devices/${id}`, { token: token || "" }),
    enabled: Boolean(enabled && token && id),
    staleTime: 60_000,
  });
}

export function useDeviceList({
  token,
  slug,
  page = 1,
  limit = 20,
  filters = {},
  enabled = true,
}: UseDeviceListOptions) {
  return useQuery({
    queryKey: deviceKeys.list({ slug, filters, page, limit }),
    queryFn: () => apiFetch<DevicesListResponse>(buildDeviceListPath({ page, limit, filters }), { token: token || "" }),
    enabled: Boolean(enabled && token),
    staleTime: 60_000,
  });
}

function buildDeviceListPath({
  page,
  limit,
  filters,
}: {
  page: number;
  limit: number;
  filters: Record<string, string | number | boolean | null | undefined>;
}) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }

  return `/devices?${query.toString()}`;
}
