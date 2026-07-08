// ── Port Types ──────────────────────────────────────────────────────────

export type DevicePort = {
  id: string;
  port_id?: string | null;
  device_id?: string | null;
  port_index: number;
  port_label?: string | null;
  port_type?: string | null;
  direction?: string | null;
  status?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_number?: string | null;
  ont_device_id?: string | null;
  notes?: string | null;
};

export type PortConnection = {
  id: string;
  connection_id?: string | null;
  from_port_id?: string | null;
  to_port_id?: string | null;
  connection_type?: string | null;
  status?: string | null;
  cable_device_id?: string | null;
  core_start?: number | null;
  core_end?: number | null;
  notes?: string | null;
};

// ── Tray Layout Config ─────────────────────────────────────────────────

export type TrayConfig = {
  id: string;
  label: string;
  portRange: [number, number]; // inclusive [start, end]
};

export type TrayLayoutConfig = {
  trays: TrayConfig[];
};

// ── TIA/EIA-598 Fiber Color Code ───────────────────────────────────────
// Standard 12-fiber color code digunakan untuk identifikasi core fiber.
// Setiap port_index % 12 menentukan warna fiber.

export type FiberColor = {
  name: string;
  hex: string;
  /** Tailwind bg/border class untuk stripe visual */
  tailwindClass: string;
};

export const FIBER_COLORS: FiberColor[] = [
  { name: "Blue",      hex: "#2563EB", tailwindClass: "bg-blue-600" },
  { name: "Orange",    hex: "#EA580C", tailwindClass: "bg-orange-600" },
  { name: "Green",     hex: "#16A34A", tailwindClass: "bg-green-600" },
  { name: "Brown",     hex: "#92400E", tailwindClass: "bg-amber-800" },
  { name: "Slate",     hex: "#64748B", tailwindClass: "bg-slate-500" },
  { name: "White",     hex: "#F8FAFC", tailwindClass: "bg-white border border-muted-foreground/20" },
  { name: "Red",       hex: "#DC2626", tailwindClass: "bg-red-600" },
  { name: "Black",     hex: "#1C1917", tailwindClass: "bg-neutral-900" },
  { name: "Yellow",    hex: "#EAB308", tailwindClass: "bg-yellow-500" },
  { name: "Violet",    hex: "#9333EA", tailwindClass: "bg-purple-600" },
  { name: "Rose",      hex: "#E11D48", tailwindClass: "bg-rose-600" },
  { name: "Aqua",      hex: "#0891B2", tailwindClass: "bg-cyan-600" },
];

/** Dapatkan warna fiber berdasarkan port_index (1-indexed, siklus 12). */
export function getFiberColor(portIndex: number): FiberColor {
  // port_index biasanya 1-indexed → (index - 1) % 12
  const idx = Math.max(0, (portIndex - 1) % 12);
  return FIBER_COLORS[idx] || FIBER_COLORS[0];
}

/** Dapatkan nomor core fiber (untuk tooltip/label). */
export function getFiberCoreNumber(portIndex: number): number {
  return ((portIndex - 1) % 12) + 1;
}

// ── Dynamic Layout Generator ───────────────────────────────────────────

/**
 * Generate tray layout dinamis berdasarkan total port.
 *
 * @param totalPorts Jumlah total port pada device (dari total_ports).
 * @param portsPerTray Jumlah port per tray fisik (default: 12 untuk OTB).
 * @returns TrayLayoutConfig dengan tray A, B, C, ... Z.
 *
 * Contoh: totalPorts=96, portsPerTray=12 → 8 tray (A-H), masing-masing 12 port.
 */
export function generateTrayLayout(
  totalPorts: number,
  portsPerTray: number = 12,
): TrayLayoutConfig {
  const trayCount = Math.max(1, Math.ceil(totalPorts / portsPerTray));
  const trays: TrayConfig[] = [];

  for (let i = 0; i < trayCount; i++) {
    const start = i * portsPerTray + 1;
    const end = Math.min((i + 1) * portsPerTray, totalPorts);
    const label = String.fromCharCode(65 + i); // A, B, C, ...
    trays.push({
      id: label,
      label: `Tray ${label}`,
      portRange: [start, end],
    });
  }

  return { trays };
}

// ── Static Layouts for Non-Dynamic Devices ─────────────────────────────

export const ODC_TRAY_LAYOUT: TrayLayoutConfig = {
  trays: [
    { id: "feeder", label: "Feeder", portRange: [1, 12] },
    { id: "dist-a", label: "Distribution A", portRange: [13, 24] },
    { id: "dist-b", label: "Distribution B", portRange: [25, 36] },
    { id: "dist-c", label: "Distribution C", portRange: [37, 48] },
  ],
};

export const JC_TRAY_LAYOUT: TrayLayoutConfig = {
  trays: [
    { id: "main", label: "Tray", portRange: [1, 24] },
  ],
};

// ── Layout Resolution ──────────────────────────────────────────────────

/**
 * Resolve layout config untuk device type tertentu.
 *
 * - OTB: layout dinamis dari totalPorts dengan 12 port per tray.
 * - ODC/JC: static layout.
 * - Device lain: null (tidak support tray view).
 */
export function resolveTrayLayout(
  deviceTypeKey: string,
  totalPorts?: number,
): TrayLayoutConfig | null {
  const key = deviceTypeKey.toUpperCase();

  if (key === "OTB") {
    const portCount = totalPorts && totalPorts > 0 ? totalPorts : 48;
    return generateTrayLayout(portCount, 12);
  }

  if (key === "ODC") return ODC_TRAY_LAYOUT;
  if (key === "JC") return JC_TRAY_LAYOUT;

  return null;
}

// ── Helpers ────────────────────────────────────────────────────────────

/** Determine which tray a port belongs to based on its port_index. */
export function getTrayForPort(portIndex: number, layout: TrayLayoutConfig): TrayConfig | null {
  return layout.trays.find(
    (tray) => portIndex >= tray.portRange[0] && portIndex <= tray.portRange[1],
  ) || null;
}

/** Group ports into trays based on layout config. */
export function groupPortsByTray(
  ports: DevicePort[],
  layout: TrayLayoutConfig,
): Map<string, DevicePort[]> {
  const grouped = new Map<string, DevicePort[]>();
  for (const tray of layout.trays) {
    grouped.set(tray.id, []);
  }
  for (const port of ports) {
    const tray = getTrayForPort(port.port_index, layout);
    if (tray) {
      const list = grouped.get(tray.id);
      if (list) list.push(port);
    }
  }
  return grouped;
}

// ── Peer Option Types (for PortAssignmentDrawer) ───────────────────────

export type PeerDeviceOption = {
  value: string;
  label: string;
};

export type PeerPortOption = {
  value: string;
  label: string;
};

// ── Status Visual Helpers ──────────────────────────────────────────────

export function getPortStatusClass(status?: string | null): string {
  if (status === "used") return "bg-emerald-500";
  if (status === "reserved") return "bg-amber-400";
  if (status === "down" || status === "maintenance" || status === "faulty") return "bg-rose-500";
  return "bg-slate-300";
}

export function getPortStatusLabel(status?: string | null): string {
  if (status === "used") return "used";
  if (status === "reserved") return "reserved";
  if (status === "down") return "down";
  if (status === "maintenance") return "maintenance";
  if (status === "faulty") return "faulty";
  return "idle";
}

/** Build a Map<portId, PortConnection> from an array of connections. */
export function buildConnectionMap(
  connections: PortConnection[],
): Map<string, PortConnection> {
  const map = new Map<string, PortConnection>();
  for (const conn of connections) {
    if (conn.from_port_id) map.set(conn.from_port_id, conn);
    if (conn.to_port_id) map.set(conn.to_port_id, conn);
  }
  return map;
}

export function getConnectionLabel(connection?: PortConnection | null): string {
  if (!connection) return "Belum terhubung";
  const typeLabel = connection.connection_type || "terhubung";
  if (connection.cable_device_id) return `${typeLabel} via kabel`;
  return typeLabel;
}
