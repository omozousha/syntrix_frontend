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
  nhost_email_verified?: boolean | null;
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
      headers={["Name", "Email", "Verified", "Role", "Region", "Active", "Actions"]}
      rows={users.map((item) => [
        <div key={`${item.id}-name`}>
          <p className="font-medium">{item.full_name || "-"}</p>
          <p className="text-xs text-muted-foreground">{item.user_code || "-"}</p>
        </div>,
        item.email,
        <VerificationBadge key={`${item.id}-verified`} user={item} />,
        <Badge key={`${item.id}-role`} variant="outline">
          {roleLabels[String(item.role_name || "")] || item.role_name}
        </Badge>,
        getRegionLabel({ fallback: item.default_region_id ? regionMap.get(item.default_region_id) : "", optional: true }),
        item.is_active ? <Badge key="active">Active</Badge> : <Badge key="inactive" variant="secondary">Inactive</Badge>,
        <div key={item.id} className="flex flex-wrap gap-2">
          {getVerificationState(item) !== "verified" ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => onResendVerification(item)}
              disabled={!canManageUser(item) || resendLoadingId === item.id}
            >
              <Send className="size-3.5" />
              {resendLoadingId === item.id ? "Sending..." : "Resend"}
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => onEdit(item)} disabled={!canManageUser(item)}>
            Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onDelete(item)} disabled={!canManageUser(item)}>
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
      <Badge className="gap-1">
        <MailCheck className="size-3" />
        Verified
      </Badge>
    );
  }
  if (state === "pending") {
    return (
      <Badge variant="secondary" className="gap-1">
        <MailWarning className="size-3" />
        Pending
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <MailWarning className="size-3" />
      Unverified
    </Badge>
  );
}
