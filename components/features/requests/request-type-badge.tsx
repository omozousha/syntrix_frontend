import { Badge } from "@/components/ui/badge";

export type RequestTypeKind =
  | "create_asset"
  | "update_asset"
  | "archive_asset"
  | "provision_asset"
  | "topology_connection"
  | "field_validation";

const TYPE_BADGE_CLASS: Record<RequestTypeKind, string> = {
  create_asset: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-200",
  update_asset: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-200",
  archive_asset: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200",
  provision_asset: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200",
  topology_connection: "border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-500/40 dark:bg-cyan-500/15 dark:text-cyan-200",
  field_validation: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200",
};

export function RequestTypeBadge({
  kind,
  label,
  className = "",
}: {
  kind: RequestTypeKind;
  label: string;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={`${TYPE_BADGE_CLASS[kind]} ${className}`.trim()}>
      {label}
    </Badge>
  );
}
