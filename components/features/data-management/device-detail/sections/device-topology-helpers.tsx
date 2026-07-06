import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


// ── Shared Types ──────────────────────────────────────────────────────────

export type DeviceLookupOption = {
  id: string;
  device_id?: string | null;
  device_name?: string | null;
  device_type_key?: string | null;
  region_id?: string | null;
  route_type?: string | null;
};

export type PortLookupOption = {
  id: string;
  port_id?: string | null;
  port_label?: string | null;
  port_index?: number | null;
  device_id?: string | null;
};

export type RouteLookupOption = {
  id: string;
  route_id?: string | null;
  route_name?: string | null;
  route_code?: string | null;
  route_type?: string | null;
  region_id?: string | null;
};

export type CustomerLookupOption = {
  id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_number?: string | null;
};

export type TopologyLookupData = {
  devices: DeviceLookupOption[];
  ports: PortLookupOption[];
  routes: RouteLookupOption[];
  customers: CustomerLookupOption[];
  loadingDevices: boolean;
  loadingPorts: boolean;
  loadingRoutes: boolean;
};

// ── Shared Props ──────────────────────────────────────────────────────────

export type TopologySectionProps = {
  form: Record<string, string>;
  onChange: (next: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  editing: boolean;
  topologyLookup?: Partial<TopologyLookupData>;
};

// Note: TopologySectionProps tetap pakai `Record<string, string>` (bukan EditableForm)
// karena topology sections hanya mengakses topology-specific fields yang tidak
// termasuk di DeviceBaseForm (misal: upstream_device_id, from_cable_id, dll.).
// Di runtime, form yang di-pass selalu bertipe EditableForm = DeviceBaseForm & Record<string, string>.
// Ini menghindari circular dependency import.

// ── Helper: Build default empty lookup data ───────────────────────────────

export function emptyTopologyLookup(): TopologyLookupData {
  return {
    devices: [],
    ports: [],
    routes: [],
    customers: [],
    loadingDevices: false,
    loadingPorts: false,
    loadingRoutes: false,
  };
}

// ── Helper: Map device options to combobox format ──────────────────────────

export function toDeviceOptions(
  devices: DeviceLookupOption[],
  placeholderLabel = "Pilih device",
): Array<{ value: string; label: string }> {
  return [
    { value: "__none__", label: placeholderLabel },
    ...devices.map((device) => ({
      value: device.id,
      label: [device.device_name, device.device_id].filter(Boolean).join(" - ") || "Device tidak tersedia",
    })),
  ];
}

export function toPortOptions(
  ports: PortLookupOption[],
  placeholderLabel = "Pilih port",
): Array<{ value: string; label: string }> {
  return [
    { value: "__none__", label: placeholderLabel },
    ...ports.map((port) => ({
      value: port.id,
      label: port.port_label || `Port ${port.port_index || "?"}`,
    })),
  ];
}

export function toRouteOptions(
  routes: RouteLookupOption[],
  placeholderLabel = "Pilih route",
): Array<{ value: string; label: string }> {
  return [
    { value: "__none__", label: placeholderLabel },
    ...routes.map((route) => ({
      value: route.id,
      label: [route.route_name, route.route_code].filter(Boolean).join(" | ") || "Route tidak tersedia",
    })),
  ];
}

export function toCustomerOptions(
  customers: CustomerLookupOption[],
  placeholderLabel = "Pilih customer",
): Array<{ value: string; label: string }> {
  return [
    { value: "__none__", label: placeholderLabel },
    ...customers.map((customer) => ({
      value: customer.id,
      label: [customer.customer_name, customer.customer_number ? `CID ${customer.customer_number}` : customer.customer_id]
        .filter(Boolean)
        .join(" - ") || "Customer tidak tersedia",
    })),
  ];
}

// ── Topology Section Card Shell ───────────────────────────────────────────

export function TopologyCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-transparent">
      <CardHeader className="px-3 py-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
        {children}
      </CardContent>
    </Card>
  );
}
