import { MailCheck, MailWarning, Send } from "lucide-react";
import { OperationalState } from "@/components/operational-ui";
import { SimpleTable } from "@/components/simple-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getVerificationState } from "@/lib/domain-formatters";
import { getRegionLabel } from "@/lib/relation-labels";

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
};

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
  if (!users.length) {
    return (
      <OperationalState
        title="Tidak ada akun"
        description="Tidak ada akun yang cocok dengan filter role, region, atau pencarian saat ini."
        actionLabel="Reset Filter"
        onAction={onResetFilter}
      />
    );
  }

  return (
    <SimpleTable
      headers={["Nama & ID", "Email", "Verifikasi", "Role", "Region", "Status", "Aksi"]}
      rows={users.map((item) => [
        <div key={`${item.id}-name`}>
          <p className="font-medium text-foreground">{item.full_name || "-"}</p>
          <p className="font-mono text-[11px] tabular-nums text-muted-foreground">{item.user_code || "-"}</p>
        </div>,
        <span key={`${item.id}-email`} className="font-mono text-xs text-muted-foreground">
          {item.email}
        </span>,
        <VerificationBadge key={`${item.id}-verified`} user={item} />,
        <Badge key={`${item.id}-role`} variant="outline" className="font-mono text-[9px] uppercase tracking-[0.12em]">
          {roleLabels[String(item.role_name || "")] || item.role_name}
        </Badge>,
        <span key={`${item.id}-reg`} className="text-xs">
          {getRegionLabel({ fallback: item.default_region_id ? regionMap.get(item.default_region_id) : "", optional: true })}
        </span>,
        item.is_active ? (
          <Badge key="active" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-mono text-[9px] uppercase tracking-[0.12em]">
            Aktif
          </Badge>
        ) : (
          <Badge key="inactive" variant="secondary" className="font-mono text-[9px] uppercase tracking-[0.12em]">
            Nonaktif
          </Badge>
        ),
        <div key={item.id} className="flex flex-wrap gap-1.5">
          {getVerificationState(item) !== "verified" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 rounded-full px-2.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
              onClick={() => onResendVerification(item)}
              disabled={!canManageUser(item) || resendLoadingId === item.id}
            >
              <Send className="size-3" />
              {resendLoadingId === item.id ? "Kirim..." : "Resend"}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            className="h-7 rounded-full px-2.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            onClick={() => onEdit(item)}
            disabled={!canManageUser(item)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 rounded-full px-2.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            onClick={() => onDelete(item)}
            disabled={!canManageUser(item)}
          >
            Hapus
          </Button>
        </div>,
      ])}
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
