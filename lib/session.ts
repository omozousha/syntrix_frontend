import { apiFetch, type LoginResponse, type MeResponse } from "@/lib/api";

export const TOKEN_KEY = "syntrix_access_token";
export const REFRESH_TOKEN_KEY = "syntrix_refresh_token";
export const TOKEN_EXPIRES_AT_KEY = "syntrix_access_token_expires_at";

export type AppRole = "admin" | "user_region" | "user_all_region";

export type SessionUser = MeResponse["data"];
export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  expiresAt: number;
};

export function getStoredToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOKEN_KEY) || "";
}

export function storeToken(token: string, expiresAt?: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  if (expiresAt && Number.isFinite(expiresAt)) {
    window.localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Math.floor(expiresAt)));
  }
}

export function clearStoredToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
}

export function getStoredRefreshToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(REFRESH_TOKEN_KEY) || "";
}

export function getStoredTokenExpiresAt(): number {
  if (typeof window === "undefined") return 0;
  const value = Number(window.localStorage.getItem(TOKEN_EXPIRES_AT_KEY) || 0);
  return Number.isFinite(value) ? value : 0;
}

export function storeSessionTokens(session: SessionTokens) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, session.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  window.localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Math.floor(session.expiresAt)));
}

export async function loginWithPassword(email: string, password: string): Promise<SessionTokens> {
  const result = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const accessToken = result.data?.session?.accessToken || "";
  const refreshToken = result.data?.session?.refreshToken || "";
  const accessTokenExpiresIn = Number(result.data?.session?.accessTokenExpiresIn || 0);

  if (!accessToken) {
    throw new Error("Access token tidak ditemukan.");
  }
  if (!refreshToken) {
    throw new Error("Refresh token tidak ditemukan.");
  }

  const expiresIn = Number.isFinite(accessTokenExpiresIn) && accessTokenExpiresIn > 0
    ? accessTokenExpiresIn
    : 900;

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresIn: expiresIn,
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

export async function refreshSessionByRefreshToken(refreshToken: string): Promise<SessionTokens> {
  const result = await apiFetch<{
    data?: {
      accessToken?: string;
      refreshToken?: string;
      accessTokenExpiresIn?: number;
    };
  }>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const accessToken = result.data?.accessToken || "";
  const nextRefreshToken = result.data?.refreshToken || "";
  const accessTokenExpiresIn = Number(result.data?.accessTokenExpiresIn || 0);

  if (!accessToken || !nextRefreshToken || !Number.isFinite(accessTokenExpiresIn) || accessTokenExpiresIn <= 0) {
    throw new Error("Refresh session gagal: token response tidak lengkap.");
  }

  return {
    accessToken,
    refreshToken: nextRefreshToken,
    accessTokenExpiresIn,
    expiresAt: Date.now() + accessTokenExpiresIn * 1000,
  };
}

export async function fetchCurrentUser(token: string): Promise<SessionUser> {
  const result = await apiFetch<MeResponse>("/auth/me", { token });
  return result.data;
}
