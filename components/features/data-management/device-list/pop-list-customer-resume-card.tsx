"use client";

import Link from "next/link";
import { Users, TrendingUp, ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslate } from "@/lib/use-locale";

type PopItem = Record<string, unknown> & {
  id: string;
  pop_name?: string;
  pop_code?: string;
  customer_count?: number;
};

type PopListCustomerResumeCardProps = {
  pops: PopItem[];
  selectedPopId?: string | null;
  selectedPopLabel?: string;
};

export function PopListCustomerResumeCard({
  pops,
  selectedPopId,
  selectedPopLabel,
}: PopListCustomerResumeCardProps) {
  const { t } = useTranslate();
  const isSpecificPop = Boolean(selectedPopId && selectedPopId !== "__all" && selectedPopId !== "__null__");
  const activePop = isSpecificPop ? pops.find((p) => p.id === selectedPopId) : null;

  const totalCustomers = pops.reduce((sum, p) => sum + Number(p.customer_count || 0), 0);
  const activePopCustomerCount = activePop ? Number(activePop.customer_count || 0) : 0;
  const popsWithCustomers = pops.filter((p) => Number(p.customer_count || 0) > 0).length;

  const topPop = [...pops].sort((a, b) => Number(b.customer_count || 0) - Number(a.customer_count || 0))[0];
  const topPopCount = Number(topPop?.customer_count || 0);

  const targetHref = isSpecificPop && selectedPopId
    ? `/data-management/list/customer?pop_id=${encodeURIComponent(selectedPopId)}`
    : "/data-management/list/customer";

  return (
    <div className="rounded-[1.5rem] border border-border/40 bg-muted/10 p-1 shadow-2xs dark:bg-white/[0.01]">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-[calc(1.5rem-0.25rem)] border border-border/60 bg-card glass-inset p-4 transition-all duration-300">
        {/* Left Section: Info & Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Users className="size-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                {t("popResume.title")}
              </span>
              <Badge
                variant="secondary"
                className="font-mono text-[9px] uppercase tracking-[0.12em] rounded-full"
              >
                {isSpecificPop ? t("popResume.filterActive") : t("popResume.pageCatalog")}
              </Badge>
            </div>
            <p className="truncate text-sm font-semibold text-foreground">
              {isSpecificPop
                ? (selectedPopLabel || String(activePop?.pop_name || t("popResume.selectedPop")))
                : t("popResume.crossPop")}
            </p>
          </div>
        </div>

        {/* Middle Section: Metrics */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 border-y sm:border-y-0 sm:border-x border-border/40 py-2 sm:py-0 sm:px-6">
          {isSpecificPop ? (
            <>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                  {t("popResume.connectedCustomers")}
                </p>
                <p className="font-mono text-xl font-bold tabular-nums text-foreground">
                  {activePopCustomerCount.toLocaleString("id-ID")}
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                  {t("popResume.networkStatus")}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                  <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {t("popResume.serving")}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                  {t("popResume.totalCustomers")}
                </p>
                <p className="font-mono text-xl font-bold tabular-nums text-foreground">
                  {totalCustomers.toLocaleString("id-ID")}
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                  {t("popResume.popsWithCustomers")}
                </p>
                <p className="font-mono text-xl font-bold tabular-nums text-foreground">
                  {popsWithCustomers}{" "}
                  <span className="text-xs font-normal text-muted-foreground">/ {pops.length}</span>
                </p>
              </div>
              {topPop && topPopCount > 0 ? (
                <div className="hidden md:block">
                  <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                    {t("popResume.topPop")}
                  </p>
                  <p className="truncate font-mono text-xs font-semibold text-foreground max-w-[140px]">
                    {String(topPop.pop_name || topPop.pop_code || "-")}{" "}
                    <span className="text-primary font-bold">({topPopCount})</span>
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Right Section: Action Button */}
        <div className="shrink-0 flex items-center">
          <Button
            asChild
            size="sm"
            className="w-full sm:w-auto rounded-full font-mono text-[10px] uppercase tracking-[0.12em] gap-1.5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          >
            <Link href={targetHref}>
              {isSpecificPop ? t("popResume.viewThisPop") : t("popResume.viewAll")}
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
