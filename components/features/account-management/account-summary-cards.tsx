import type { ReactNode } from "react";
import { MailCheck, MailWarning, ShieldCheck, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export type AccountSummaryStats = {
  total: number;
  verified: number;
  active: number;
  pending: number;
};

export function AccountSummaryCards({ stats }: { stats: AccountSummaryStats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={<Users className="size-3.5" />} label="Total Account" value={stats.total} />
      <MetricCard icon={<MailCheck className="size-3.5" />} label="Verified Email" value={stats.verified} />
      <MetricCard icon={<ShieldCheck className="size-3.5" />} label="Active" value={stats.active} />
      <MetricCard icon={<MailWarning className="size-3.5" />} label="Pending Verify" value={stats.pending} />
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between gap-2 p-3">
        <div>
          <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
        <div className="rounded-md border bg-muted p-1.5 text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}
