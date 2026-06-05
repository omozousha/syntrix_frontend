import type { QueryClient } from "@tanstack/react-query";
import { deviceKeys, historyKeys, masterDataKeys, referenceDataKeys, requestKeys } from "@/lib/query-keys";

export function invalidateReferenceData(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: referenceDataKeys.all });
}

export async function invalidateDeviceData(queryClient: QueryClient, deviceId?: string | null) {
  await queryClient.invalidateQueries({ queryKey: deviceKeys.all });
  if (deviceId) {
    await queryClient.invalidateQueries({ queryKey: deviceKeys.detail(deviceId) });
    await queryClient.invalidateQueries({ queryKey: historyKeys.device(deviceId) });
  }
}

export async function invalidateMasterData(queryClient: QueryClient, resourceType?: string | null) {
  await queryClient.invalidateQueries({ queryKey: masterDataKeys.all });
  if (resourceType) {
    await queryClient.invalidateQueries({ queryKey: masterDataKeys.list(resourceType) });
  }
  await invalidateReferenceData(queryClient);
}

export async function invalidateValidationRequestData(
  queryClient: QueryClient,
  input: { requestId?: string | null; deviceId?: string | null } = {},
) {
  await queryClient.invalidateQueries({ queryKey: requestKeys.all });
  if (input.requestId) {
    await queryClient.invalidateQueries({ queryKey: requestKeys.detail(input.requestId) });
  }
  if (input.deviceId) {
    await invalidateDeviceData(queryClient, input.deviceId);
  }
}
