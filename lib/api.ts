export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://syntrix-backend.vercel.app/api/v1";

type ApiFetchOptions = RequestInit & {
  token?: string;
};

export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, headers, body, ...rest } = options;
  const mergedHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  if (!(body instanceof FormData) && !mergedHeaders["Content-Type"]) {
    mergedHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    mergedHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    body,
    headers: mergedHeaders,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = (payload as { message?: string })?.message || `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export type LoginResponse = {
  success: boolean;
  message: string;
  data?: {
    session?: {
      accessToken?: string;
      accessTokenExpiresIn?: number;
    };
  };
};

export type MeResponse = {
  success: boolean;
  message: string;
  data: {
    role: "admin" | "user_region" | "user_all_region";
    claims: Record<string, unknown>;
    app_user: {
      id: string;
      full_name: string;
      email: string;
      role_name: "admin" | "user_region" | "user_all_region";
      default_region_id: string | null;
      user_region_scopes: Array<{ region_id: string }>;
    };
  };
};

export type DashboardSummaryResponse = {
  success: boolean;
  message: string;
  data: {
    devices: number;
    pops: number;
    projects: number;
    customers: number;
    routes: number;
    validations: number;
    monitoring_snapshots: number;
  };
};

export type PopsListResponse = {
  success: boolean;
  message: string;
  data: Array<{
    id: string;
    pop_id: string;
    pop_code: string;
    pop_name: string;
    status_pop: string;
    region_id: string;
  }>;
};

export type DevicesListResponse = {
  success: boolean;
  message: string;
  data: Array<{
    id: string;
    device_id: string;
    device_name: string;
    device_type_key: string;
    status: string;
    region_id: string;
    pop_id: string | null;
  }>;
};

export type UsersListResponse = {
  success: boolean;
  message: string;
  data: Array<{
    id: string;
    user_code: string;
    full_name: string;
    email: string;
    role_name: string;
    is_active: boolean;
    default_region_id: string | null;
  }>;
};
