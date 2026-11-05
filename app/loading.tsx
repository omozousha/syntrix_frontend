"use client";

import { AppLoading } from "@/components/app-loading-new";
import { useTranslate } from "@/lib/use-locale";

export default function Loading() {
  const { t } = useTranslate();
  return <AppLoading fullscreen label={t("appLoading.loadingPageFull")} />;
}
