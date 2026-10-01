"use client";

import Link from "next/link";
import { Users, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslate } from "@/lib/use-locale";
import type { MessageKey } from "@/lib/locales";

type CustomerStatusSummary = {
  status: string;
  count: number;
};

type PopBentoCustomerTileProps = {
  popId: string;
  totalCustomers: number;
  statusSummary: CustomerStatusSummary[];
  loading?: boolean;
};

const STATUS_LABEL_KEY: Record<string, MessageKey> = {
  active: "common.status.active",
  inactive: "common.status.inactive",
  terminated: "common.status.terminated",
  suspended: "common.status.suspended",
  prospect: "common.status.prospect",
};

const STATUS_TONE_MAP: Record<string, string> = {
  active: "text-emerald-600 dark:text-emerald-400",
  inactive: "text-muted-foreground",
  terminated: "text-rose-600 dark:text-rose-400",
  suspended: "text-amber-600 dark:text-amber-400",
  prospect: "text-sky-600 dark:text-sky-400",
};

export function PopBentoCustomerTile({
  popId,
  totalCustomers,
  statusSummary,
  loading = false,
}: PopBentoCustomerTileProps) {
  const { t, locale } = useTranslate();
  const numberLocale = locale === "en" ? "en-US" : "id-ID";
  const activeCount = statusSummary.find((s) => s.status === "active")?.count ?? 0;
  const nonActiveCount = totalCustomers - activeCount;
  const listHref = `/data-management/list/customer?pop_id=${encodeURIComponent(popId)}`;

  return (
    <Card className="rounded-2xl border-border/60 shadow-xs glass-inset transition-all duration-300">
      <CardContent className="p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">{t("customerTile.title")}</h2>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Active Service Endpoints
              </p>
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-full font-mono text-[11px] uppercase tracking-wider transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] gap-1.5"
          >
            <Link href={listHref}>
              {t("customerTile.viewAll")}
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>

        {/* Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Total */}
          <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-2 transition-all duration-300 hover:border-primary/40">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("customerTile.total")}
            </p>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {totalCustomers.toLocaleString(numberLocale)}
              </p>
            )}
            <Badge
              variant="secondary"
              className="rounded-full font-mono text-[10px] uppercase tracking-wide"
            >
              <Users className="size-2.5 mr-1" />
              {t("customerTile.allStatus")}
            </Badge>
          </div>

          {/* Aktif */}
          <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-2 transition-all duration-300 hover:border-emerald-500/40">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("customerTile.active")}
            </p>
            {loading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="font-mono text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {activeCount.toLocaleString(numberLocale)}
              </p>
            )}
            <Badge
              className="rounded-full font-mono text-[10px] uppercase tracking-wide bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
            >
              <CheckCircle2 className="size-2.5 mr-1" />
              {t("common.status.active")}
            </Badge>
          </div>

          {/* Non-Aktif */}
          <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-2 transition-all duration-300 hover:border-border/60">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("customerTile.inactive")}
            </p>
            {loading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="font-mono text-2xl font-bold tabular-nums text-muted-foreground">
                {nonActiveCount.toLocaleString(numberLocale)}
              </p>
            )}
            <Badge
              variant="secondary"
              className="rounded-full font-mono text-[10px] uppercase tracking-wide"
            >
              <XCircle className="size-2.5 mr-1" />
              {t("customerTile.inactiveBadge")}
            </Badge>
          </div>
        </div>

        {/* Status Breakdown (if more than 2 status types) */}
        {statusSummary.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
              {t("customerTile.breakdown")}
            </p>
            {statusSummary.map((s) => (
              <Link key={s.status} href={`${listHref}&status=${encodeURIComponent(s.status)}`}>
                <Badge
                  variant="outline"
                  className={`rounded-full font-mono text-[10px] uppercase tracking-wide cursor-pointer transition-all duration-200 hover:border-primary/60 ${STATUS_TONE_MAP[s.status] ?? "text-muted-foreground"}`}
                >
                  {t(STATUS_LABEL_KEY[s.status] ?? "common.status.unknown")}:{" "}
                  <span className="tabular-nums ml-1 font-bold">{s.count.toLocaleString(numberLocale)}</span>
                </Badge>
              </Link>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && totalCustomers === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-4 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted/30 text-muted-foreground">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{t("customerTile.emptyTitle")}</p>
              <p className="text-xs text-muted-foreground">
                {t("customerTile.emptyDescription")}
              </p>
            </div>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="rounded-full font-mono text-[11px] uppercase tracking-wider transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            >
              <Link href={listHref}>{t("customerTile.emptyAction")}</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
