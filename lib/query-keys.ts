import type { ReferenceDataGroup } from "@/lib/api";

type DeviceListKeyInput = {
  slug?: string | null;
  filters?: Record<string, unknown>;
  page?: number;
  limit?: number;
};

export const referenceDataKeys = {
  all: ["reference-data"] as const,
  list: (input: { groups?: ReferenceDataGroup[]; scope?: string | null; limit?: number } = {}) =>
    [...referenceDataKeys.all, normalizeKeyInput(input)] as const,
};

export const deviceKeys = {
  all: ["devices"] as const,
  list: (input: DeviceListKeyInput = {}) => [...deviceKeys.all, "list", normalizeKeyInput(input)] as const,
  detail: (id: string) => [...deviceKeys.all, "detail", id] as const,
};

export const requestKeys = {
  all: ["validation-requests"] as const,
  list: (input: Record<string, unknown> = {}) => [...requestKeys.all, "list", normalizeKeyInput(input)] as const,
  detail: (id: string) => [...requestKeys.all, "detail", id] as const,
};

export const historyKeys = {
  all: ["validation-history"] as const,
  device: (deviceId: string) => [...historyKeys.all, "device", deviceId] as const,
};

export const masterDataKeys = {
  all: ["master-data"] as const,
  list: (type: string, input: Record<string, unknown> = {}) => [...masterDataKeys.all, type, normalizeKeyInput(input)] as const,
};

function normalizeKeyInput<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}
