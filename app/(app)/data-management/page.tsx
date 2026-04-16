"use client";

import { useEffect, useState } from "react";
import { SimpleTable } from "@/components/simple-table";
import { useSession } from "@/components/session-context";
import { apiFetch, type DevicesListResponse, type PopsListResponse } from "@/lib/api";

export default function DataManagementPage() {
  const { token } = useSession();
  const [pops, setPops] = useState<PopsListResponse["data"]>([]);
  const [devices, setDevices] = useState<DevicesListResponse["data"]>([]);

  useEffect(() => {
    async function run() {
      const [popsRes, devicesRes] = await Promise.all([
        apiFetch<PopsListResponse>("/pops?page=1&limit=20", { token }),
        apiFetch<DevicesListResponse>("/devices?page=1&limit=20", { token }),
      ]);
      setPops(popsRes.data || []);
      setDevices(devicesRes.data || []);
    }
    void run();
  }, [token]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Data Management/Database</h2>
        <p className="text-sm text-slate-600">Data user otomatis mengikuti region scope backend.</p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-slate-800">POP List</h3>
        <SimpleTable
          headers={["POP ID", "Code", "Name", "Status", "Region"]}
          rows={pops.map((item) => [item.pop_id, item.pop_code, item.pop_name, item.status_pop, item.region_id])}
        />
      </div>

      <div>
        <h3 className="mb-2 font-medium text-slate-800">Device List</h3>
        <SimpleTable
          headers={["Device ID", "Name", "Type", "Status", "Region"]}
          rows={devices.map((item) => [item.device_id, item.device_name, item.device_type_key, item.status, item.region_id])}
        />
      </div>
    </div>
  );
}
