"use client";

import { useEffect, useState } from "react";
import { apiFetch, type DashboardSummaryResponse } from "@/lib/api";
import { useSession } from "@/components/session-context";

export default function DashboardPage() {
  const { token } = useSession();
  const [summary, setSummary] = useState<DashboardSummaryResponse["data"] | null>(null);

  useEffect(() => {
    async function run() {
      const result = await apiFetch<DashboardSummaryResponse>("/dashboard/summary", { token });
      setSummary(result.data);
    }
    void run();
  }, [token]);

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Dashboard</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="POPs" value={summary?.pops ?? 0} />
        <StatCard label="Devices" value={summary?.devices ?? 0} />
        <StatCard label="Projects" value={summary?.projects ?? 0} />
        <StatCard label="Customers" value={summary?.customers ?? 0} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
