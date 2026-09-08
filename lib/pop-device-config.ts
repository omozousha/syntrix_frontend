import { apiFetch } from "@/lib/api";

export const POP_DEVICE_TYPES = [
  { key: "RACK", label: "Rack Cabinet", category: "indoor", description: "Cabinet 19\" penempatan perangkat (42U/24U)" },
  { key: "OLT", label: "OLT (Headend)", category: "indoor", description: "Optical Line Terminal aktif transmisi GPON" },
  { key: "OTB", label: "OTB (Terminasi)", category: "indoor", description: "Optical Termination Box terminasi core optik" },
  { key: "SWITCH", label: "Switch Jaringan", category: "indoor", description: "L2/L3 Distribution & Access Switch" },
  { key: "ROUTER", label: "Router Core", category: "indoor", description: "Core/PE Router transmisi data" },
  { key: "RECTIFIER", label: "Rectifier / Power", category: "indoor", description: "Power supply DC, baterai & inverter" },
  { key: "ODC", label: "ODC Cabinet", category: "outdoor", description: "Optical Distribution Cabinet luar shelter" },
  { key: "ODP", label: "ODP Distribusi", category: "outdoor", description: "Optical Distribution Point akses pelanggan" },
  { key: "CABLE", label: "Kabel Fiber", category: "outdoor", description: "Bentangan feeder/distribusi terkait POP" },
  { key: "JC", label: "Joint Closure", category: "outdoor", description: "Kotak sambung core fiber perimeter POP" },
] as const;

export const POP_INDOOR_PRESET = ["RACK", "OLT", "OTB", "SWITCH", "ROUTER", "RECTIFIER"];
export const POP_ALL_PRESET = POP_DEVICE_TYPES.map((t) => t.key);

export const DEFAULT_POP_VISIBLE_DEVICE_TYPES = POP_INDOOR_PRESET;
const STORAGE_KEY = "syntrix_pop_visible_device_types";

export const RACK_MOUNTABLE_DEVICE_TYPES = new Set([
  "OTB",
  "OLT",
  "SWITCH",
  "ROUTER",
  "RECTIFIER",
  "SERVER",
  "UPS",
  "DDF",
]);

/**
 * Hanya perangkat aktif (OLT, SWITCH, ROUTER, RECTIFIER, dll.)
 * dan perangkat pasif OTB yang diizinkan masuk ke dalam rak.
 * Perangkat lain seperti ODC, ODP, CABLE, JC dilarang masuk rak.
 */
export function isRackMountable(device: { device_type_key?: string | null; asset_group?: string | null }): boolean {
  const typeKey = String(device.device_type_key || "").toUpperCase();
  if (typeKey === "RACK") return false;
  if (typeKey === "OTB") return true;
  if (device.asset_group === "active") return true;
  return RACK_MOUNTABLE_DEVICE_TYPES.has(typeKey);
}

export function getStoredPopVisibleDeviceTypes(userMetadata?: Record<string, unknown> | null): string[] {
  // 1. Prioritaskan metadata profil user di database
  if (userMetadata && Array.isArray(userMetadata.pop_visible_device_types)) {
    const list = userMetadata.pop_visible_device_types.map(String).map((s) => s.toUpperCase());
    if (list.length > 0) return list;
  }

  // 2. Fallback ke localStorage
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(String).map((s) => s.toUpperCase());
        }
      }
    } catch {
      // Ignore parse error
    }
  }

  // 3. Default: perangkat indoor rak
  return DEFAULT_POP_VISIBLE_DEVICE_TYPES;
}

export async function savePopVisibleDeviceTypes(types: string[], token?: string): Promise<void> {
  const sanitized = Array.from(new Set(types.map((s) => s.toUpperCase())));

  // Simpan ke localStorage instan
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
      // Ignore quota error
    }
  }

  // Simpan ke backend akun user jika token tersedia
  if (token) {
    try {
      await apiFetch("/auth/me", {
        method: "PATCH",
        token,
        body: {
          metadata: {
            pop_visible_device_types: sanitized,
          },
        },
      });
    } catch (err) {
      console.warn("[POP Config] Gagal sinkronisasi config ke akun:", err);
    }
  }
}
