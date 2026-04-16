import { apiFetch, type LoginResponse, type MeResponse } from "@/lib/api";

export const TOKEN_KEY = "syntrix_access_token";

export type AppRole = "admin" | "user_region" | "user_all_region";

export type SessionUser = MeResponse["data"];

export function getStoredToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOKEN_KEY) || "";
}

export function storeToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function loginWithPassword(email: string, password: string): Promise<string> {
  const result = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const token = result.data?.session?.accessToken || "";
  if (!token) {
    throw new Error("Access token tidak ditemukan.");
  }
  return token;
}

export async function fetchCurrentUser(token: string): Promise<SessionUser> {
  const result = await apiFetch<MeResponse>("/auth/me", { token });
  return result.data;
}
