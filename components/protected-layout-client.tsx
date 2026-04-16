"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SessionProvider } from "@/components/session-context";
import {
  clearStoredToken,
  fetchCurrentUser,
  getStoredToken,
  type SessionUser,
} from "@/lib/session";

export function ProtectedLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState("");
  const [me, setMe] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken("");
    setMe(null);
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    async function bootstrap() {
      const saved = getStoredToken();
      if (!saved) {
        router.replace("/login");
        setLoading(false);
        return;
      }

      setToken(saved);
      try {
        const profile = await fetchCurrentUser(saved);
        setMe(profile);
      } catch {
        clearStoredToken();
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [router]);

  useEffect(() => {
    if (!me) return;
    if (pathname === "/account-management" && me.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [me, pathname, router]);

  if (loading || !me || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="rounded bg-white px-4 py-3 text-sm text-slate-700 shadow">Loading session...</p>
      </main>
    );
  }

  return (
    <SessionProvider value={{ token, me, logout }}>
      <AppShell me={me} onLogout={logout}>
        {children}
      </AppShell>
    </SessionProvider>
  );
}
