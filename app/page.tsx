"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken } from "@/lib/session";
import { useTranslate } from "@/lib/use-locale";

export default function RootPage() {
  const router = useRouter();
  const { t } = useTranslate();

  useEffect(() => {
    const token = getStoredToken();
    router.replace(token ? "/dashboard" : "/login");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <p className="rounded bg-card px-4 py-3 text-sm text-foreground shadow">{t("appLoading.redirecting")}</p>
    </main>
  );
}
