"use client";

import { useEffect, useState } from "react";
import { SimpleTable } from "@/components/simple-table";
import { useSession } from "@/components/session-context";
import { apiFetch, type PopsListResponse } from "@/lib/api";

export default function MapsPage() {
  const { token } = useSession();
  const [pops, setPops] = useState<PopsListResponse["data"]>([]);

  useEffect(() => {
    async function run() {
      const result = await apiFetch<PopsListResponse>("/pops?page=1&limit=20", { token });
      setPops(result.data || []);
    }
    void run();
  }, [token]);

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Maps</h2>
      <p className="mb-3 text-sm text-slate-600">Klik POP untuk membuka pencarian di OpenStreetMap.</p>
      <SimpleTable
        headers={["POP", "Status", "OpenStreetMap"]}
        rows={pops.map((item) => [
          item.pop_name,
          item.status_pop,
          <a
            key={item.id}
            href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(item.pop_name)}`}
            target="_blank"
            rel="noreferrer"
            className="text-teal-700 underline"
          >
            Open Map
          </a>,
        ])}
      />
    </div>
  );
}
