import type { ReactNode } from "react";
import { MailCheck, MailWarning, ShieldCheck, Users } from "lucide-react";

export type AccountSummaryStats = {
  total: number;
  verified: number;
  active: number;
  pending: number;
};

export function AccountSummaryCards({ stats }: { stats: AccountSummaryStats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={<Users className="size-4 text-sky-500" />} label="Total Akun" value={stats.total} />
      <MetricCard icon={<MailCheck className="size-4 text-emerald-500" />} label="Email Terverifikasi" value={stats.verified} />
      <MetricCard icon={<ShieldCheck className="size-4 text-blue-500" />} label="Akun Aktif" value={stats.active} />
      <MetricCard icon={<MailWarning className="size-4 text-amber-500" />} label="Menunggu Verifikasi" value={stats.pending} />
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-[1.5rem] border border-border/40 bg-muted/10 p-1 shadow-2xs dark:bg-white/[0.01]">
      <div className="flex items-center justify-between gap-3 rounded-[calc(1.5rem-0.25rem)] border border-border/60 bg-card glass-inset p-3.5">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-muted/30 p-2 shadow-2xs">{icon}</div>
      </div>
    </div>
  );
}
