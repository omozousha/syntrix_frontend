"use client";

import { useEffect, useMemo, useState } from "react";
import { Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslate, type TFn } from "@/lib/use-locale";
import type { MessageKey } from "@/lib/locales";

const TIP_ROTATION_INTERVAL_MS = 7000;

type SidebarSmartTipMenuItem = {
  href: string;
  label: string;
};

export function SidebarSmartTip({
  pathname,
  menus,
}: {
  pathname: string;
  menus: SidebarSmartTipMenuItem[];
}) {
  const [rotation, setRotation] = useState({ key: "", index: 0 });
  const { t } = useTranslate();
  const allowedHrefs = useMemo(() => new Set(menus.map((menu) => menu.href)), [menus]);
  const tips = useMemo(() => getSmartTips(pathname, allowedHrefs, t), [pathname, allowedHrefs, t]);
  const tipsKey = tips.join("|");
  const activeTipIndex = rotation.key === tipsKey ? rotation.index % tips.length : 0;
  const activeTip = tips[activeTipIndex] || tips[0];

  useEffect(() => {
    if (tips.length <= 1) return;

    const interval = window.setInterval(() => {
      setRotation((current) => ({
        key: tipsKey,
        index: current.key === tipsKey ? (current.index + 1) % tips.length : 1 % tips.length,
      }));
    }, TIP_ROTATION_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [tips.length, tipsKey]);

  return (
    <div className="rounded-xl border border-sidebar-border/60 bg-sidebar-accent/15 px-3 py-2.5 shadow-2xs dark:bg-white/[0.01]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="rounded-md font-mono text-[9px] uppercase tracking-[0.15em] border-sidebar-border/70 text-muted-foreground bg-background/50">
            {t("tip.label")}
          </Badge>
          <Lightbulb className="size-3.5 text-sidebar-foreground/50" />
        </div>
        {tips.length > 1 ? (
          <div aria-label={t("tip.count", { index: activeTipIndex + 1, total: tips.length })} className="flex items-center gap-1">
            {tips.map((tip, index) => (
              <span
                key={tip}
                className={`size-1.5 rounded-full transition-colors duration-300 ${
                  index === activeTipIndex ? "bg-sidebar-foreground/70" : "bg-sidebar-foreground/20"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
      <p key={activeTip} className="min-h-10 text-[11px] leading-relaxed text-sidebar-foreground/70 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
        {activeTip}
      </p>
    </div>
  );
}

type TipGroup =
  | "dashboardReviewer"
  | "dashboardValidator"
  | "requests"
  | "listOdp"
  | "listDevice"
  | "fieldOdp"
  | "auditTrail"
  | "trash"
  | "maps"
  | "genericRequests"
  | "genericOdp"
  | "default";

function getSmartTips(pathname: string, allowedHrefs: Set<string>, t: TFn) {
  const tip = (group: TipGroup) => [
    t(`tip.${group}.1` as MessageKey),
    t(`tip.${group}.2` as MessageKey),
    t(`tip.${group}.3` as MessageKey),
  ];

  if (pathname.startsWith("/dashboard") && allowedHrefs.has("/dashboard")) {
    return allowedHrefs.has("/requests")
      ? tip("dashboardReviewer")
      : tip("dashboardValidator");
  }

  if (pathname.startsWith("/requests") && allowedHrefs.has("/requests")) {
    return tip("requests");
  }

  if (pathname.startsWith("/data-management/list/odp") && allowedHrefs.has("/data-management/list/odp")) {
    return tip("listOdp");
  }

  if (pathname.startsWith("/data-management/list/") && allowedHrefs.has("/data-management")) {
    return tip("listDevice");
  }

  if (pathname.startsWith("/field/odp")) {
    return tip("fieldOdp");
  }

  if (pathname.startsWith("/audit-trail") && allowedHrefs.has("/audit-trail")) {
    return tip("auditTrail");
  }

  if (pathname.startsWith("/trash") && allowedHrefs.has("/trash")) {
    return tip("trash");
  }

  if (pathname.startsWith("/maps") && allowedHrefs.has("/maps")) {
    return tip("maps");
  }

  if (allowedHrefs.has("/requests")) {
    return tip("genericRequests");
  }

  if (allowedHrefs.has("/data-management/list/odp")) {
    return tip("genericOdp");
  }

  return tip("default");
}
