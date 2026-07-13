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

// ── OLT Line Card Layout ───────────────────────────────────────────────
// OLT (Optical Line Terminal) adalah active device dengan arsitektur
// chassis modular: beberapa line card slots + uplink ports.
// Layout: line cards = groups, masing-masing 8-16 port PON, + uplink section.

/**
 * Generate layout untuk OLT berdasarkan jumlah port dan uplink.
 *
 * @param totalPorts Total port (PON + uplink), dari total_ports device.
 * @param ponPortCount Jumlah port PON (optional, default totalPorts - uplinkCount).
 * @param uplinkPortCount Jumlah port uplink (optional, default 4).
 * @param portsPerLineCard Jumlah port per line card (default 8).
 * @returns TrayLayoutConfig dengan tray per line card + uplink section.
 */
// ── SWITCH Port Layout ──────────────────────────────────────────────
// SWITCH (Network Switch) adalah active device dengan arsitektur fixed chassis.
// Layout: access ports (RJ45) + uplink ports (SFP+) + console/mgmt (optional).

/**
 * Generate layout untuk SWITCH berdasarkan jumlah port access dan uplink.
 *
 * @param totalPorts Total port (access + uplink), dari total_ports device.
 * @param accessPortCount Jumlah port access RJ45 (optional, default totalPorts - uplinkCount).
 * @param uplinkPortCount Jumlah port uplink SFP+ (optional, default 4).
 * @param portsPerRow Jumlah port per baris (optional, default 24 untuk switch 48-port).
 * @returns TrayLayoutConfig dengan tray access + uplink section.
 */
export function generateSwitchLayout(
  totalPorts: number,
  accessPortCount?: number,
  uplinkPortCount?: number,
  portsPerRow: number = 24,
): TrayLayoutConfig {
  const uplinkCount = (uplinkPortCount && uplinkPortCount > 0) ? Math.min(uplinkPortCount, 8) : 4;
  const accessCount = (accessPortCount && accessPortCount > 0)
    ? accessPortCount
    : Math.max(0, totalPorts - uplinkCount);

  const trays: TrayConfig[] = [];
  let currentPort = 1;

  // Generate access port rows
  if (accessCount > 0) {
    const rowCount = Math.max(1, Math.ceil(accessCount / portsPerRow));
    for (let i = 0; i < rowCount; i++) {
      const start = currentPort;
      const end = Math.min(start + portsPerRow - 1, accessCount);
      if (start > end) break;
      const label = rowCount > 1
        ? `Access Ports ${start}–${end}`
        : `Access Ports (1–${accessCount})`;
      trays.push({
        id: `access-row-${i + 1}`,
        label,
        portRange: [start, end],
      });
      currentPort = end + 1;
    }
  }

  // Uplink section (port setelah access)
  const uplinkStart = currentPort;
  const uplinkEnd = uplinkStart + uplinkCount - 1;
  if (uplinkCount > 0) {
    trays.push({
      id: "uplink",
      label: `Uplink (SFP+)`,
      portRange: [uplinkStart, uplinkEnd],
    });
  }

  return { trays };
}


export function generateOltLayout(
  totalPorts: number,
  ponPortCount?: number,
  uplinkPortCount?: number,
  portsPerLineCard: number = 8,
): TrayLayoutConfig {
  const uplinkCount = (uplinkPortCount && uplinkPortCount > 0) ? Math.min(uplinkPortCount, 8) : 4;
  const ponCount = (ponPortCount && ponPortCount > 0)
    ? ponPortCount
    : Math.max(0, totalPorts - uplinkCount);

  const trays: TrayConfig[] = [];
  let currentPort = 1;

  // Generate line cards
  const lineCardCount = Math.max(1, Math.ceil(ponCount / portsPerLineCard));
  for (let i = 0; i < lineCardCount; i++) {
    const start = currentPort;
    const end = Math.min(start + portsPerLineCard - 1, ponCount);
    if (start > end) break;
    trays.push({
      id: `lc-${i + 1}`,
      label: `Line Card ${i + 1} (PON ${start}–${end})`,
      portRange: [start, end],
    });
    currentPort = end + 1;
  }

  // Uplink section (port setelah PON)
  const uplinkStart = currentPort;
  const uplinkEnd = uplinkStart + uplinkCount - 1;
  if (uplinkCount > 0) {
    trays.push({
      id: "uplink",
      label: `Uplink (SFP+)`,
      portRange: [uplinkStart, uplinkEnd],
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
    { id: "main", label: "Tube", portRange: [1, 24] },
  ],
};

// ── Tray Config from Master Data (asset_model.tray_config) ──────────────

/**
 * Tray config yang disimpan di asset_model.tray_config.
 *
 * Contoh JSON di tray_config:
 * ```json
 * {
 *   "ports_per_tray": 12,
 *   "trays": [
 *     { "id": "feeder", "label": "Feeder", "portRange": [1, 12] },
 *     { "id": "dist-a", "label": "Distribution A", "portRange": [13, 24] }
 *   ]
 * }
 * ```
 */
export type TrayConfigPayload = {
  /** Untuk dynamic layout: jumlah port per tray (default 12) */
  ports_per_tray?: number;
  /** Untuk static layout: daftar tray (override totalPorts-based generation) */
  trays?: Array<{ id: string; label: string; portRange: [number, number] }>;
};

/**
 * Parse tray config dari asset_model.tray_config.
 * Sekarang payload langsung berupa objek tray_config (bukan specification_template),
 * jadi tidak perlu akses payload["tray_config"].
 * Mengembalikan TrayLayoutConfig jika format valid, null jika tidak ada.
 */
export function parseTrayConfigFromPayload(payload: unknown): TrayLayoutConfig | null {
  if (!payload || typeof payload !== "object") return null;
  const trayConfig = payload as TrayConfigPayload;

  // Static: explicit trays list
  if (trayConfig.trays && Array.isArray(trayConfig.trays) && trayConfig.trays.length > 0) {
    const validTrays = trayConfig.trays.filter(
      (t: unknown): t is { id: string; label: string; portRange: [number, number] } =>
        t !== null && typeof t === "object" && "id" in (t as object) && "label" in (t as object) && "portRange" in (t as object),
    );
    if (validTrays.length > 0) {
      return { trays: validTrays };
    }
  }

  return null;
}

// ── Layout Resolution ──────────────────────────────────────────────────

/**
 * Resolve layout config untuk device type tertentu.
 *
 * Priority:
 * 1. Jika ada trayConfigPayload (dari asset_model), parse dulu.
 * 2. OTB: layout dinamis dari totalPorts dengan ports_per_tray dari config atau default 12.
 * 3. ODC/JC: static layout (bisa di-override oleh trayConfigPayload).
 * 4. Device lain: null (tidak support tray view).
 *
 * @param deviceTypeKey Device type key (OTB, ODC, JC, dll).
 * @param totalPorts Jumlah total port device.
 * @param trayConfigPayload Konfigurasi tray dari asset_model (opsional).
 */
export function resolveTrayLayout(
  deviceTypeKey: string,
  totalPorts?: number,
  trayConfigPayload?: unknown,
): TrayLayoutConfig | null {
  const key = deviceTypeKey.toUpperCase();

  // Priority 1: tray config dari master data
  const fromMasterData = trayConfigPayload ? parseTrayConfigFromPayload(trayConfigPayload) : null;
  // Untuk ODC/JC, master data bisa override static layout
  if (fromMasterData) return fromMasterData;

  // Priority 2: ODC/JC static layouts
  if (key === "ODC") return ODC_TRAY_LAYOUT;
  if (key === "JC") return JC_TRAY_LAYOUT;

  // Priority 3: OTB dinamis
  if (key === "OTB") {
    const portCount = totalPorts && totalPorts > 0 ? totalPorts : 48;
    // trayConfigPayload sekarang langsung objek tray_config (bukan specification_template),
    // jadi baca ports_per_tray langsung dari payload.
    const portsPerTray =
      trayConfigPayload &&
      typeof trayConfigPayload === "object"
        ? (trayConfigPayload as Record<string, unknown>)["ports_per_tray"] as number | undefined
        : undefined;
    return generateTrayLayout(portCount, portsPerTray || 12);
  }

  // Priority 4: OLT — line card layout (reserved for future use)
  // Saat ini OLT menggunakan OltPortContainer langsung dengan generateOltLayout().
  // Branch ini untuk integrasi via PortTrayContainer jika diperlukan di masa depan.
    if (key === "SWITCH") {
    const portCount = totalPorts && totalPorts > 0 ? totalPorts : 48;
    let accessCount: number | undefined;
    let uplinkCount: number | undefined;
    if (trayConfigPayload && typeof trayConfigPayload === "object") {
      const cfg = trayConfigPayload as Record<string, unknown>;
      accessCount = cfg.access_port_count as number | undefined;
      uplinkCount = cfg.uplink_port_count as number | undefined;
    }
    return generateSwitchLayout(portCount, accessCount, uplinkCount);
  }

  // Priority 4: OLT — line card layout (reserved for future use)
  if (key === "OLT") {
    const portCount = totalPorts && totalPorts > 0 ? totalPorts : 24;
    let ponCount: number | undefined;
    let uplinkCount: number | undefined;
    if (trayConfigPayload && typeof trayConfigPayload === "object") {
      const cfg = trayConfigPayload as Record<string, unknown>;
      ponCount = cfg.pon_port_count as number | undefined;
      uplinkCount = cfg.uplink_port_count as number | undefined;
    }
    return generateOltLayout(portCount, ponCount, uplinkCount);
  }

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

// ── Tube Colors (per tray/tube) ────────────────────────────────────────
// Setiap tray mewakili 1 tube fisik dengan warna background khas.

export type TubeColor = {
  name: string;
  /** Warna background soft untuk tray container */
  bg: string;
  /** Warna border kiri untuk tray container */
  border: string;
  /** Warna header text */
  text: string;
};

/**
 * 8 warna tube yang distinct, di-loop untuk tray > 8.
 * Menggunakan warna pastel/soft agar tidak mengganggu fiber color stripe di port card.
 */
export const TUBE_COLORS: TubeColor[] = [
  { name: "Blue",    bg: "bg-blue-50/80",    border: "border-l-blue-500",  text: "text-blue-800" },
  { name: "Orange",  bg: "bg-orange-50/80",   border: "border-l-orange-500", text: "text-orange-800" },
  { name: "Green",   bg: "bg-green-50/80",    border: "border-l-green-500", text: "text-green-800" },
  { name: "Purple",  bg: "bg-purple-50/80",   border: "border-l-purple-500",text: "text-purple-800" },
  { name: "Pink",    bg: "bg-pink-50/80",     border: "border-l-pink-500",  text: "text-pink-800" },
  { name: "Cyan",    bg: "bg-cyan-50/80",     border: "border-l-cyan-500",  text: "text-cyan-800" },
  { name: "Yellow",  bg: "bg-yellow-50/80",   border: "border-l-yellow-500",text: "text-yellow-800" },
  { name: "Red",     bg: "bg-red-50/80",      border: "border-l-red-500",   text: "text-red-800" },
];

/** Dapatkan warna tube berdasarkan index tray (0-indexed, siklus 8). */
export function getTubeColor(trayIndex: number): TubeColor {
  return TUBE_COLORS[trayIndex % TUBE_COLORS.length];
}


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
