"use client";

import { Check, Clock, Copy, MailCheck, MailWarning, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { OperationalState } from "@/components/operational-ui";
import { SimpleTable } from "@/components/simple-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getVerificationState } from "@/lib/domain-formatters";
import { getRegionLabel } from "@/lib/relation-labels";
import { useTranslate } from "@/lib/use-locale";

export type AccountUserRow = {
  id: string;
  full_name?: string | null;
  user_code?: string | null;
  email?: string | null;
  role_name?: string | null;
  default_region_id?: string | null;
  is_active?: boolean | null;
  email_verified?: boolean | null;
  verification_status?: string | null;
  metadata?: Record<string, unknown> | null;
};

// ponytail: Firebase's per-address send guard is undocumented (~1 min observed,
// 50s failed in production). 90s is a safe margin. Replace with a server-provided
// value if Firebase publishes the real number.
const RESEND_COOLDOWN_MS = 90_000;

function cooldownEndsAt(user: AccountUserRow): number {
  const raw = user.metadata?.verification_email_sent_at;
  if (!raw) return 0;
  const sentAt = new Date(String(raw)).getTime();
  return Number.isNaN(sentAt) ? 0 : sentAt + RESEND_COOLDOWN_MS;
}

export function AccountTable({
  users,
  regionMap,
  roleLabels,
  resendLoadingId,
  canManageUser,
  onEdit,
  onDelete,
  onResendVerification,
  onResetFilter,
}: {
  users: AccountUserRow[];
  regionMap: Map<string, string | undefined>;
  roleLabels: Record<string, string>;
  resendLoadingId: string | null;
  canManageUser: (user: AccountUserRow) => boolean;
  onEdit: (user: AccountUserRow) => void;
  onDelete: (user: AccountUserRow) => void;
  onResendVerification: (user: AccountUserRow) => void;
  onResetFilter: () => void;
}) {
  const { t } = useTranslate();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // One interval for the whole table instead of one per row.
  const hasCooldown = users.some((item) => cooldownEndsAt(item) > now);
  useEffect(() => {
    if (!hasCooldown) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [hasCooldown]);

  function copyEmail(item: AccountUserRow) {
    if (!item.email) return;
    navigator.clipboard.writeText(item.email);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (!users.length) {
    return (
      <OperationalState
        title={t("accountTable.emptyTitle")}
        description={t("accountTable.emptyDescription")}
        actionLabel={t("accountFilter.reset")}
        onAction={onResetFilter}
      />
    );
  }

  return (
    <SimpleTable
      headers={[
        t("accountTable.colNameId"),
        t("accountTable.colEmail"),
        t("accountTable.colVerification"),
        t("accountTable.colRole"),
        t("accountTable.colRegion"),
        t("accountTable.colStatus"),
        t("accountTable.colAction"),
      ]}
      rows={users.map((item) => {
        const remainingMs = cooldownEndsAt(item) - now;
        const coolingDown = remainingMs > 0;
        return [
        <div key={`${item.id}-name`}>
          <p className="font-medium text-foreground">{item.full_name || "-"}</p>
          <p className="font-mono text-[11px] tabular-nums text-muted-foreground">{item.user_code || "-"}</p>
        </div>,
        <button
          key={`${item.id}-email`}
          type="button"
          title={t("accountTable.copyEmail")}
          onClick={() => copyEmail(item)}
          disabled={!item.email}
          className="group flex max-w-[220px] items-center gap-1.5 rounded-full px-1.5 py-1 -mx-1.5 text-left font-mono text-xs text-muted-foreground transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:hover:bg-transparent"
        >
          <span className="truncate">{item.email || "-"}</span>
          {copiedId === item.id ? (
            <Check className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Copy className="size-3 shrink-0 opacity-0 transition-opacity duration-300 group-hover:opacity-70" />
          )}
        </button>,
        <VerificationBadge key={`${item.id}-verified`} user={item} />,
        <Badge key={`${item.id}-role`} variant="outline" className="font-mono text-[9px] uppercase tracking-[0.12em]">
          {roleLabels[String(item.role_name || "")] || item.role_name}
        </Badge>,
        <span key={`${item.id}-reg`} className="text-xs">
          {getRegionLabel({ fallback: item.default_region_id ? regionMap.get(item.default_region_id) : "", optional: true })}
        </span>,
        item.is_active ? (
          <Badge key="active" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-mono text-[9px] uppercase tracking-[0.12em]">
            {t("accountTable.active")}
          </Badge>
        ) : (
          <Badge key="inactive" variant="secondary" className="font-mono text-[9px] uppercase tracking-[0.12em]">
            {t("accountTable.inactive")}
          </Badge>
        ),
        <div key={item.id} className="flex flex-wrap gap-1.5">
          {getVerificationState(item) !== "verified" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 rounded-full px-2.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
              onClick={() => onResendVerification(item)}
              disabled={!canManageUser(item) || resendLoadingId === item.id || coolingDown}
              title={coolingDown ? t("accountTable.resendCooldown", { seconds: Math.ceil(remainingMs / 1000) }) : undefined}
            >
              {coolingDown ? <Clock className="size-3" /> : <Send className="size-3" />}
              {resendLoadingId === item.id
                ? t("accountTable.sending")
                : coolingDown
                  ? `${Math.ceil(remainingMs / 1000)}s`
                  : t("accountTable.resend")}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            className="h-7 rounded-full px-2.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            onClick={() => onEdit(item)}
            disabled={!canManageUser(item)}
          >
            {t("accountTable.edit")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 rounded-full px-2.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            onClick={() => onDelete(item)}
            disabled={!canManageUser(item)}
          >
            {t("accountTable.delete")}
          </Button>
        </div>,
        ];
      })}
    />
  );
}

function VerificationBadge({ user }: { user: AccountUserRow }) {
  const state = getVerificationState(user);
  if (state === "verified") {
    return (
      <Badge className="gap-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-mono text-[9px] uppercase tracking-[0.12em]">
        <MailCheck className="size-3" />
        Verified
      </Badge>
    );
  }
  if (state === "pending") {
    return (
      <Badge variant="secondary" className="gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-mono text-[9px] uppercase tracking-[0.12em]">
        <MailWarning className="size-3" />
        Pending
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1 font-mono text-[9px] uppercase tracking-[0.12em]">
      <MailWarning className="size-3" />
      Unverified
    </Badge>
  );
}
