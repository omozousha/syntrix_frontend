"use client";

import { PopBentoRackKpiTile } from "./pop-bento-rack-kpi-tile";
import { PopBentoCustomerTile } from "./pop-bento-customer-tile";

type PopBentoRackCustomerPanelProps = {
  totalRacks: number;
  totalU: number;
  usedU: number;
  popId: string;
  deviceTypeCounts: Record<string, number>;
  visibleDeviceTypes: string[];
  token?: string;
  onVisibleTypesChange: (next: string[]) => void;
  totalCustomers: number;
  statusSummary: Array<{ status: string; count: number }>;
  loadingCustomer?: boolean;
};

export function PopBentoRackCustomerPanel({
  totalRacks,
  totalU,
  usedU,
  popId,
  deviceTypeCounts,
  visibleDeviceTypes,
  token,
  onVisibleTypesChange,
  totalCustomers,
  statusSummary,
  loadingCustomer = false,
}: PopBentoRackCustomerPanelProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* LEFT: Rak & Utilisasi (7 cols) */}
      <div className="lg:col-span-7">
        <PopBentoRackKpiTile
          totalRacks={totalRacks}
          totalU={totalU}
          usedU={usedU}
          popId={popId}
          deviceTypeCounts={deviceTypeCounts}
          visibleDeviceTypes={visibleDeviceTypes}
          token={token}
          onVisibleTypesChange={onVisibleTypesChange}
        />
      </div>

      {/* RIGHT: Pelanggan & Titik Layanan (5 cols) */}
      <div className="lg:col-span-5">
        <PopBentoCustomerTile
          popId={popId}
          totalCustomers={totalCustomers}
          statusSummary={statusSummary}
          loading={loadingCustomer}
        />
      </div>
    </div>
  );
}