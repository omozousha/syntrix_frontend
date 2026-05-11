"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AppLoading } from "@/components/app-loading-new";
import { SessionProvider } from "@/components/session-context";
import {
  clearStoredToken,
  fetchCurrentUser,
  getStoredRefreshToken,
  getStoredToken,
  getStoredTokenExpiresAt,
  refreshSessionByRefreshToken,
  storeSessionTokens,
  type SessionUser,
} from "@/lib/session";

const SESSION_CHECK_INTERVAL_MS = 15_000;
const SESSION_REFRESH_BUFFER_MS = 60_000;
const IDLE_WINDOW_MS = 2 * 60_000;

export function ProtectedLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [tokenExpiresAt, setTokenExpiresAt] = useState(0);
  const [me, setMe] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const lastActivityAtRef = useRef(Date.now());
  const getNextTarget = useCallback(() => {
    if (typeof window === "undefined") {
      return pathname || "/dashboard";
    }

    const path = `${window.location.pathname}${window.location.search}`.trim();
    if (!path.startsWith("/")) {
      return "/dashboard";
    }

    return path || "/dashboard";
  }, [pathname]);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken("");
    setRefreshToken("");
    setTokenExpiresAt(0);
    setMe(null);
    const nextPath = getNextTarget();
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
  }, [getNextTarget, router]);

  useEffect(() => {
    async function bootstrap() {
      const saved = getStoredToken();
      if (!saved) {
        const nextPath = getNextTarget();
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        setLoading(false);
        return;
      }

      setToken(saved);
      setRefreshToken(getStoredRefreshToken());
      setTokenExpiresAt(getStoredTokenExpiresAt());
      try {
        const profile = await fetchCurrentUser(saved);
        setMe(profile);
      } catch {
        clearStoredToken();
        const nextPath = getNextTarget();
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [router, getNextTarget]);

  useEffect(() => {
    if (!me) return;
    const adminOnlyPaths = ["/master-data", "/audit-trail", "/trash"];
    if (adminOnlyPaths.some((path) => pathname.startsWith(path)) && me.role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    if (pathname.startsWith("/account-management") && !["admin", "user_all_region"].includes(me.role)) {
      router.replace("/dashboard");
      return;
    }

    if (me.role === "user_region") {
      const validatorBlockedPaths = [
        "/dashboard",
        "/validation-requests",
        "/requests",
        "/data-management/as-built",
        "/data-management/as-built-documents",
        "/data-management/create",
        "/data-management/topology",
      ];
      if (validatorBlockedPaths.some((path) => pathname.startsWith(path))) {
        router.replace("/data-management");
      }
    }
  }, [me, pathname, router]);

  useEffect(() => {
    if (!token || !refreshToken) return;

    const markActivity = () => {
      lastActivityAtRef.current = Date.now();
    };

    const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"];
    events.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));

    let refreshing = false;
    const interval = window.setInterval(async () => {
      if (refreshing) return;
      const expiresAt = tokenExpiresAt || getStoredTokenExpiresAt();
      if (!expiresAt) return;

      const now = Date.now();
      const remainingMs = expiresAt - now;

      if (remainingMs > SESSION_REFRESH_BUFFER_MS) return;

      const idleMs = now - lastActivityAtRef.current;
      const isIdle = idleMs >= IDLE_WINDOW_MS;

      if (remainingMs <= 0 && isIdle) {
        window.location.reload();
        return;
      }

      if (isIdle) return;

      try {
        refreshing = true;
        const nextSession = await refreshSessionByRefreshToken(refreshToken);
        storeSessionTokens(nextSession);
        setToken(nextSession.accessToken);
        setRefreshToken(nextSession.refreshToken);
        setTokenExpiresAt(nextSession.expiresAt);
      } catch {
        logout();
      } finally {
        refreshing = false;
      }
    }, SESSION_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      events.forEach((eventName) => window.removeEventListener(eventName, markActivity));
    };
  }, [token, refreshToken, tokenExpiresAt, logout]);

  if (loading || !me || !token) {
    return <AppLoading fullscreen label="Sedang memuat sesi pengguna..." />;
  }

  return (
    <SessionProvider value={{ token, me, logout }}>
      <AppShell me={me} onLogout={logout}>
        {children}
      </AppShell>
    </SessionProvider>
  );
}
