export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://syntrix-backend.vercel.app/api/v1";

type JsonBody = Record<string, unknown> | unknown[];

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | JsonBody | null;
  token?: string;
  timeoutMs?: number;
  retryCount?: number;
};

const API_RETRY_COUNT = 2;
const API_RETRY_DELAY_MS = 350;
const API_GET_CACHE_TTL_MS = 20_000;
const API_DEFAULT_TIMEOUT_MS = 20_000;
const apiGetInFlight = new Map<string, Promise<unknown>>();
const apiGetCache = new Map<string, { expiresAt: number; payload: unknown }>();

export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, headers, body, timeoutMs = API_DEFAULT_TIMEOUT_MS, retryCount = API_RETRY_COUNT, ...rest } = options;
  const method = (rest.method || "GET").toUpperCase();
  const isGet = method === "GET" && !body;
  const mergedHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  if (!(body instanceof FormData) && !mergedHeaders["Content-Type"]) {
    mergedHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    mergedHeaders.Authorization = `Bearer ${token}`;
  }

  const contentType = String(mergedHeaders["Content-Type"] || "").toLowerCase();
  const shouldSerializeJsonBody =
    body !== undefined &&
    body !== null &&
    !(body instanceof FormData) &&
    contentType.includes("application/json") &&
    typeof body !== "string";
  const requestBody = (shouldSerializeJsonBody ? JSON.stringify(body) : body) as BodyInit | null | undefined;

  const requestKey = `${method}:${path}:token:${token ? "1" : "0"}`;
  if (isGet) {
    const cached = apiGetCache.get(requestKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.payload as T;
    }
    const inflight = apiGetInFlight.get(requestKey);
    if (inflight) {
      return (await inflight) as T;
    }
  }

  const fetchPromise = (async () => {
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let response: Response;
        try {
          response = await fetch(`${API_BASE_URL}${path}`, {
            ...rest,
            method,
            body: requestBody,
            headers: mergedHeaders,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message = (payload as { message?: string })?.message || `Request failed: ${response.status}`;
          throw new Error(message);
        }

        if (isGet) {
          apiGetCache.set(requestKey, {
            expiresAt: Date.now() + API_GET_CACHE_TTL_MS,
            payload,
          });
        } else {
          // Invalidate read cache after write operations (POST/PATCH/DELETE/etc)
          // so list pages reflect changes immediately without manual refresh.
          apiGetCache.clear();
        }

        return payload as T;
      } catch (error) {
        lastError = error;
        if (attempt >= retryCount) {
          break;
        }
        await delay(API_RETRY_DELAY_MS * (attempt + 1));
      }
    }

    throw new Error((lastError as Error)?.message || "Network request failed");
  })();

  if (isGet) {
    apiGetInFlight.set(requestKey, fetchPromise as Promise<unknown>);
  }

  let lastError: unknown = null;
  try {
    return await fetchPromise;
  } catch (error) {
    lastError = error;
    throw new Error((lastError as Error)?.message || "Network request failed");
  } finally {
    if (isGet) {
      apiGetInFlight.delete(requestKey);
    }
  }
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export type LoginResponse = {
  success: boolean;
  message: string;
  data?: {
    session?: {
      accessToken?: string;
      accessTokenExpiresIn?: number;
      refreshToken?: string;
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
      avatar_attachment_id?: string | null;
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

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
};

export type PaginatedResponse<T> = {
  success: boolean;
  message: string;
  data: T[];
  meta?: PaginationMeta;
};

export type PopsListResponse = PaginatedResponse<{
    id: string;
    pop_id: string;
    pop_code: string;
    pop_name: string;
    status_pop: string;
    region_id: string;
  }>;

export type DevicesListResponse = PaginatedResponse<{
    id: string;
    device_id: string;
    device_name: string;
    device_type_key: string;
    status: string;
    region_id: string;
    pop_id: string | null;
  }>;

export type UsersListResponse = PaginatedResponse<{
    id: string;
    user_code: string;
    full_name: string;
    email: string;
    role_name: string;
    avatar_attachment_id?: string | null;
    is_active: boolean;
    default_region_id: string | null;
  }>;

export type RegionsListResponse = PaginatedResponse<{
    id: string;
    region_id: string;
    region_name: string;
  }>;
