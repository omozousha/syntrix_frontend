import type { ColumnDef, ValidationRule } from "./generic-import-template-download";
import type { PrerequisiteCheck } from "./generic-bulk-import-prerequisite-dialog";
import { apiFetch } from "@/lib/api";

export type BulkImportConfig = {
  pageTitle: string;
  entityType: string;
  deviceTypeKey?: string;
  assetGroup?: string;
  templateColumns: ColumnDef[];
  exampleRows: Record<string, string>[];
  instructions: string[][];
  validationRules: ValidationRule[];
  validateRow: (row: Record<string, string>) => { valid: boolean; errors: string[] };
  checkPrerequisite: (token: string | undefined) => Promise<PrerequisiteCheck | null>;
  storageKey: string;
  requiresPop: boolean;
  requiresRegion: boolean;
  requiresServiceType?: boolean;
  successEntityLabel: string;
};

function getValue(row: Record<string, string>, key: string): string {
  const found = Object.keys(row).find(
    (k) => k.toLowerCase().trim() === key.toLowerCase().trim(),
  );
  return found ? String(row[found] ?? "").trim() : "";
}

function inSet(value: string, allowed: Set<string>): boolean {
  return allowed.has(value.toLowerCase());
}

// ─── ODC ───────────────────────────────────────────────────────────
export const ODC_TEMPLATE_COLUMNS: ColumnDef[] = [
  { key: "device name", label: "device name", description: "Nama ODC unik", required: true },
  { key: "device type", label: "device type", description: "Harus ODC", required: true },
  { key: "status", label: "status", description: "draft/installed/active/inactive/maintenance/retired", required: true },
  { key: "region", label: "region", description: "Nama region lengkap", required: true },
  { key: "POP", label: "POP", description: "Kode/nama/ID POP", required: true },
  { key: "longitude", label: "longitude", description: "Koordinat (-180..180)", required: true },
  { key: "latitude", label: "latitude", description: "Koordinat (-90..90)", required: true },
  { key: "kapasitas core", label: "kapasitas core", description: "Integer > 0", required: true },
  { key: "total ports", label: "total ports", description: "Integer > 0", required: true },
  { key: "installation type", label: "installation type", description: "Aerial/Pedestrial/Wall/Ground", required: true },
];

export const ODC_EXAMPLE_ROWS: Record<string, string>[] = [
  { "device name": "ODC-JBD-001", "device type": "ODC", status: "installed", region: "Jabodebek", POP: "INV-POP-S89P4U2", longitude: "106.84513", latitude: "-6.21462", "kapasitas core": "96", "total ports": "48", "installation type": "Outdoor Pad Mounted" },
  { "device name": "ODC-BDG-001", "device type": "ODC", status: "draft", region: "Jawa Barat", POP: "CBN", longitude: "107.61912", latitude: "-6.90389", "kapasitas core": "48", "total ports": "24", "installation type": "Outdoor Pole Mounted" },
];

const ODC_VALIDATION_RULES: ValidationRule[] = [
  { rule: "device name wajib", message: "Kolom device name wajib diisi" },
  { rule: "device type harus ODC", message: "device type harus ODC" },
  { rule: "status valid", message: "Status harus draft/installed/active/inactive/maintenance/retired" },
  { rule: "region valid", message: "Region tidak ditemukan" },
  { rule: "POP valid", message: "POP tidak valid untuk region" },
  { rule: "longitude -180..180", message: "Longitude di luar range" },
  { rule: "latitude -90..90", message: "Latitude di luar range" },
  { rule: "kapasitas core integer > 0", message: "Kapasitas core harus angka > 0" },
  { rule: "total ports integer > 0", message: "Total ports harus angka > 0" },
  { rule: "installation type valid", message: "Installation type harus sesuai master" },
];

export const ODC_INSTRUCTIONS: string[][] = [
  ["PETUNJUK IMPOR MASSAL ODC"],
  [""],
  ["Kolom", "Keterangan"],
  ["device name", "Nama ODC unik (contoh: ODC-JBD-001)"],
  ["device type", "Isi ODC"],
  ["status", "draft / installed / active / inactive / maintenance / retired"],
  ["region", "Nama region lengkap persis sama dengan master database"],
  ["POP", "Kode POP 3 huruf, nama POP, atau ID inventori (INV-POP-...)"],
  ["longitude", "Koordinat desimal (-180 s/d 180)"],
  ["latitude", "Koordinat desimal (-90 s/d 90)"],
  ["kapasitas core", "Kapasitas core total (contoh: 48, 96)"],
  ["total ports", "Jumlah total port (contoh: 24, 48)"],
  ["installation type", "Outdoor Pad Mounted / Outdoor Pole Mounted / Indoor Wall Mounted"],
  ["", ""],
  ["Catatan:", "Asset group 'passive' akan di-set otomatis oleh backend."],
];

export function validateOdcRow(row: Record<string, string>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const dn = getValue(row, "device name");
  if (!dn) errors.push("device name wajib diisi");

  const dt = getValue(row, "device type").toUpperCase();
  if (!dt || dt !== "ODC") errors.push("device type harus ODC");

  const st = getValue(row, "status").toLowerCase();
  if (!st || !inSet(st, new Set(["draft", "installed", "active", "inactive", "maintenance", "retired"]))) {
    errors.push("status harus draft/installed/active/inactive/maintenance/retired");
  }

  if (!getValue(row, "region")) errors.push("region wajib diisi");
  if (!getValue(row, "POP")) errors.push("POP wajib diisi");

  const lng = Number(getValue(row, "longitude"));
  if (!getValue(row, "longitude") || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    errors.push("longitude harus -180..180");
  }
  const lat = Number(getValue(row, "latitude"));
  if (!getValue(row, "latitude") || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.push("latitude harus -90..90");
  }

  const cc = Number(getValue(row, "kapasitas core"));
  if (!getValue(row, "kapasitas core") || !Number.isFinite(cc) || cc <= 0 || !Number.isInteger(cc)) {
    errors.push("kapasitas core harus integer > 0");
  }
  const tp = Number(getValue(row, "total ports"));
  if (!getValue(row, "total ports") || !Number.isFinite(tp) || tp <= 0 || !Number.isInteger(tp)) {
    errors.push("total ports harus integer > 0");
  }
  const it = getValue(row, "installation type");
  if (!it) errors.push("installation type wajib diisi");

  return { valid: errors.length === 0, errors };
}

export const ODC_CONFIG: BulkImportConfig = {
  pageTitle: "IMPOR MASSAL ODC",
  entityType: "devices",
  deviceTypeKey: "ODC",
  assetGroup: "passive",
  templateColumns: ODC_TEMPLATE_COLUMNS,
  exampleRows: ODC_EXAMPLE_ROWS,
  instructions: ODC_INSTRUCTIONS,
  validationRules: ODC_VALIDATION_RULES,
  validateRow: validateOdcRow,
  checkPrerequisite: async (token) => {
    if (!token) return { hasData: false, count: 0, message: "Tidak ada sesi login.", entityLabel: "POP" };
    try {
      const json = await apiFetch<{ data?: { items?: unknown[] } | unknown[]; meta?: { total?: number } }>(
        "/pops?page=1&limit=1",
        { token },
      );
      const arr = Array.isArray(json?.data) ? json.data : (json?.data as { items?: unknown[] })?.items || [];
      const total = json?.meta?.total ?? arr.length;
      return {
        hasData: total > 0,
        count: total,
        message: total > 0 ? `${total} data POP tersedia.` : "Belum ada data POP.",
        entityLabel: "POP",
      };
    } catch (e) {
      return { hasData: false, count: 0, message: `Gagal cek POP: ${e instanceof Error ? e.message : e}`, entityLabel: "POP" };
    }
  },
  storageKey: "odc-bulk-import-notice-dismissed",
  requiresPop: true,
  requiresRegion: true,
  successEntityLabel: "ODC",
};

// ─── OLT ───────────────────────────────────────────────────────────
export const OLT_TEMPLATE_COLUMNS: ColumnDef[] = [
  { key: "device name", label: "device name", description: "Nama OLT unik", required: true },
  { key: "device type", label: "device type", description: "Harus OLT", required: true },
  { key: "status", label: "status", description: "draft/installed/active/inactive/maintenance/retired", required: true },
  { key: "region", label: "region", description: "Nama region lengkap", required: true },
  { key: "POP", label: "POP", description: "Kode/nama/ID POP — sumber koordinat otomatis", required: true },
  { key: "longitude", label: "longitude", description: "Koordinat (opsional, auto-isi dari POP)", required: false },
  { key: "latitude", label: "latitude", description: "Koordinat (opsional, auto-isi dari POP)", required: false },
  { key: "management ip", label: "management ip", description: "IP management", required: true },
  { key: "vlan", label: "vlan", description: "Integer 1-4094", required: true },
  { key: "total ports", label: "total ports", description: "Integer > 0", required: true },
  { key: "feeder port count", label: "feeder port count", description: "Integer >= 0", required: true },
  { key: "u height", label: "u height", description: "1/2/3/4/6", required: true },
];

export const OLT_EXAMPLE_ROWS: Record<string, string>[] = [
  { "device name": "OLT-JBD-001", "device type": "OLT", status: "installed", region: "Jabodebek", POP: "INV-POP-S89P4U2", longitude: "", latitude: "", "management ip": "10.10.10.1", vlan: "100", "total ports": "16", "feeder port count": "2", "u height": "2" },
  { "device name": "OLT-BDG-001", "device type": "OLT", status: "active", region: "Jawa Barat", POP: "CBN", longitude: "", latitude: "", "management ip": "10.20.20.1", vlan: "200", "total ports": "8", "feeder port count": "1", "u height": "1" },
];

const OLT_VALIDATION_RULES: ValidationRule[] = [
  { rule: "device name wajib", message: "Kolom device name wajib diisi" },
  { rule: "device type harus OLT", message: "device type harus OLT" },
  { rule: "status valid", message: "Status harus draft/installed/active/inactive/maintenance/retired" },
  { rule: "region valid", message: "Region tidak ditemukan" },
  { rule: "POP valid", message: "POP tidak valid untuk region" },
  { rule: "management ip valid", message: "Management IP harus format IP yang valid" },
  { rule: "vlan 1-4094", message: "VLAN harus 1-4094" },
  { rule: "total ports integer > 0", message: "Total ports harus angka > 0" },
  { rule: "feeder port count integer >= 0", message: "Feeder port count harus angka >= 0" },
  { rule: "u height 1/2/3/4/6", message: "U height harus 1, 2, 3, 4, atau 6" },
];

export const OLT_INSTRUCTIONS: string[][] = [
  ["PETUNJUK IMPOR MASSAL OLT"],
  [""],
  ["Kolom", "Keterangan"],
  ["device name", "Nama OLT unik (contoh: OLT-JBD-001)"],
  ["device type", "Isi OLT"],
  ["status", "draft / installed / active / inactive / maintenance / retired"],
  ["region", "Nama region lengkap persis sama dengan master database"],
  ["POP", "Kode POP 3 huruf, nama POP, atau ID inventori (INV-POP-...)"],
  ["longitude", "Opsional — kosongkan untuk auto-isi dari koordinat POP"],
  ["latitude", "Opsional — kosongkan untuk auto-isi dari koordinat POP"],
  ["management ip", "IP management OLT (contoh: 10.10.10.1)"],
  ["vlan", "VLAN management (1-4094)"],
  ["total ports", "Jumlah PON ports (contoh: 16)"],
  ["feeder port count", "Jumlah uplink SFP+ ports (contoh: 2)"],
  ["u height", "Tinggi rak: 1, 2, 3, 4, atau 6"],
  ["", ""],
  ["Catatan:", "Kolom POP wajib diisi. Longitude/latitude diisi otomatis dari koordinat POP bila dikosongkan."],
];

export function validateOltRow(row: Record<string, string>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const dn = getValue(row, "device name");
  if (!dn) errors.push("device name wajib diisi");

  const dt = getValue(row, "device type").toUpperCase();
  if (!dt || dt !== "OLT") errors.push("device type harus OLT");

  const st = getValue(row, "status").toLowerCase();
  if (!st || !inSet(st, new Set(["draft", "installed", "active", "inactive", "maintenance", "retired"]))) {
    errors.push("status harus draft/installed/active/inactive/maintenance/retired");
  }
  if (!getValue(row, "region")) errors.push("region wajib diisi");
  if (!getValue(row, "POP")) errors.push("POP wajib diisi");

  const mgmtIp = getValue(row, "management ip");
  if (!mgmtIp) {
    errors.push("management ip wajib diisi");
  } else if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(mgmtIp)) {
    errors.push("management ip format tidak valid");
  }

  const vlan = Number(getValue(row, "vlan"));
  if (!getValue(row, "vlan") || !Number.isInteger(vlan) || vlan < 1 || vlan > 4094) {
    errors.push("vlan harus integer 1-4094");
  }

  const tp = Number(getValue(row, "total ports"));
  if (!getValue(row, "total ports") || !Number.isFinite(tp) || tp <= 0 || !Number.isInteger(tp)) {
    errors.push("total ports harus integer > 0");
  }

  const fp = Number(getValue(row, "feeder port count"));
  if (!getValue(row, "feeder port count") || !Number.isFinite(fp) || fp < 0 || !Number.isInteger(fp)) {
    errors.push("feeder port count harus integer >= 0");
  }

  const uh = getValue(row, "u height");
  if (!uh || !["1", "2", "3", "4", "6"].includes(uh)) {
    errors.push("u height harus 1, 2, 3, 4, atau 6");
  }

  return { valid: errors.length === 0, errors };
}

export const OLT_CONFIG: BulkImportConfig = {
  pageTitle: "IMPOR MASSAL OLT",
  entityType: "devices",
  deviceTypeKey: "OLT",
  assetGroup: "active",
  templateColumns: OLT_TEMPLATE_COLUMNS,
  exampleRows: OLT_EXAMPLE_ROWS,
  instructions: OLT_INSTRUCTIONS,
  validationRules: OLT_VALIDATION_RULES,
  validateRow: validateOltRow,
  checkPrerequisite: async (token) => {
    if (!token) return { hasData: false, count: 0, message: "Tidak ada sesi login.", entityLabel: "POP" };
    try {
      const json = await apiFetch<{ data?: { items?: unknown[] } | unknown[]; meta?: { total?: number } }>(
        "/pops?page=1&limit=1",
        { token },
      );
      const arr = Array.isArray(json?.data) ? json.data : (json?.data as { items?: unknown[] })?.items || [];
      const total = json?.meta?.total ?? arr.length;
      return {
        hasData: total > 0,
        count: total,
        message: total > 0 ? `${total} data POP tersedia.` : "Belum ada data POP.",
        entityLabel: "POP",
      };
    } catch (e) {
      return { hasData: false, count: 0, message: `Gagal cek POP: ${e instanceof Error ? e.message : e}`, entityLabel: "POP" };
    }
  },
  storageKey: "olt-bulk-import-notice-dismissed",
  requiresPop: true,
  requiresRegion: true,
  successEntityLabel: "OLT",
};

// ─── OTB ───────────────────────────────────────────────────────────
export const OTB_TEMPLATE_COLUMNS: ColumnDef[] = [
  { key: "device name", label: "device name", description: "Nama OTB unik", required: true },
  { key: "device type", label: "device type", description: "Harus OTB", required: true },
  { key: "status", label: "status", description: "draft/installed/active/inactive/maintenance/retired", required: true },
  { key: "region", label: "region", description: "Nama region lengkap", required: true },
  { key: "POP", label: "POP", description: "Kode/nama/ID POP — sumber koordinat otomatis", required: true },
  { key: "longitude", label: "longitude", description: "Koordinat (opsional, auto-isi dari POP)", required: false },
  { key: "latitude", label: "latitude", description: "Koordinat (opsional, auto-isi dari POP)", required: false },
  { key: "kapasitas core", label: "kapasitas core", description: "Integer > 0", required: true },
  { key: "connector type", label: "connector type", description: "SC/UPC, SC/APC, LC/UPC, LC/APC, FC/UPC, FC/APC", required: true },
  { key: "u height", label: "u height", description: "1/2/3/4/6", required: true },
];

export const OTB_EXAMPLE_ROWS: Record<string, string>[] = [
  { "device name": "OTB-JBD-001", "device type": "OTB", status: "installed", region: "Jabodebek", POP: "INV-POP-S89P4U2", longitude: "106.84513", latitude: "-6.21462", "kapasitas core": "48", "connector type": "SC/UPC", "u height": "2" },
  { "device name": "OTB-BDG-001", "device type": "OTB", status: "draft", region: "Jawa Barat", POP: "CBN", longitude: "107.61912", latitude: "-6.90389", "kapasitas core": "24", "connector type": "LC/APC", "u height": "1" },
];

const OTB_VALIDATION_RULES: ValidationRule[] = [
  { rule: "device name wajib", message: "Kolom device name wajib diisi" },
  { rule: "device type harus OTB", message: "device type harus OTB" },
  { rule: "status valid", message: "Status harus draft/installed/active/inactive/maintenance/retired" },
  { rule: "region valid", message: "Region tidak ditemukan" },
  { rule: "POP valid", message: "POP tidak valid untuk region" },
  { rule: "longitude -180..180 (opsional)", message: "Longitude di luar range bila diisi" },
  { rule: "latitude -90..90 (opsional)", message: "Latitude di luar range bila diisi" },
  { rule: "kapasitas core integer > 0", message: "Kapasitas core harus angka > 0" },
  { rule: "connector type valid", message: "Connector type harus SC/UPC, SC/APC, LC/UPC, LC/APC, FC/UPC, atau FC/APC" },
  { rule: "u height 1/2/3/4/6", message: "U height harus 1, 2, 3, 4, atau 6" },
];

export const OTB_INSTRUCTIONS: string[][] = [
  ["PETUNJUK IMPOR MASSAL OTB"],
  [""],
  ["Kolom", "Keterangan"],
  ["device name", "Nama OTB unik (contoh: OTB-JBD-001)"],
  ["device type", "Isi OTB"],
  ["status", "draft / installed / active / inactive / maintenance / retired"],
  ["region", "Nama region lengkap persis sama dengan master database"],
  ["POP", "Kode POP 3 huruf, nama POP, atau ID inventori (INV-POP-...)"],
  ["longitude", "Opsional — kosongkan untuk auto-isi dari koordinat POP"],
  ["latitude", "Opsional — kosongkan untuk auto-isi dari koordinat POP"],
  ["kapasitas core", "Kapasitas core total (contoh: 48)"],
  ["connector type", "SC/UPC, SC/APC, LC/UPC, LC/APC, FC/UPC, FC/APC"],
  ["u height", "Tinggi rak: 1, 2, 3, 4, atau 6"],
  ["", ""],
  ["Catatan:", "Asset group 'passive' akan di-set otomatis oleh backend. Longitude/latitude diisi otomatis dari koordinat POP bila dikosongkan."],
];

const ALLOWED_CONNECTORS = new Set(["sc/upc", "sc/apc", "lc/upc", "lc/apc", "fc/upc", "fc/apc"]);

export function validateOtbRow(row: Record<string, string>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const dn = getValue(row, "device name");
  if (!dn) errors.push("device name wajib diisi");

  const dt = getValue(row, "device type").toUpperCase();
  if (!dt || dt !== "OTB") errors.push("device type harus OTB");

  const st = getValue(row, "status").toLowerCase();
  if (!st || !inSet(st, new Set(["draft", "installed", "active", "inactive", "maintenance", "retired"]))) {
    errors.push("status harus draft/installed/active/inactive/maintenance/retired");
  }
  if (!getValue(row, "region")) errors.push("region wajib diisi");
  if (!getValue(row, "POP")) errors.push("POP wajib diisi");

  // OTB: koordinat opsional — backend mengisi dari koordinat POP terkait.
  const rawLng = getValue(row, "longitude");
  if (rawLng) {
    const lng = Number(rawLng);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      errors.push("longitude harus -180..180");
    }
  }
  const rawLat = getValue(row, "latitude");
  if (rawLat) {
    const lat = Number(rawLat);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      errors.push("latitude harus -90..90");
    }
  }

  const cc = Number(getValue(row, "kapasitas core"));
  if (!getValue(row, "kapasitas core") || !Number.isFinite(cc) || cc <= 0 || !Number.isInteger(cc)) {
    errors.push("kapasitas core harus integer > 0");
  }

  const ct = getValue(row, "connector type").toLowerCase().replace(/\s/g, "");
  if (!ct || !ALLOWED_CONNECTORS.has(ct)) {
    errors.push("connector type harus SC/UPC, SC/APC, LC/UPC, LC/APC, FC/UPC, atau FC/APC");
  }

  const uh = getValue(row, "u height");
  if (!uh || !["1", "2", "3", "4", "6"].includes(uh)) {
    errors.push("u height harus 1, 2, 3, 4, atau 6");
  }

  return { valid: errors.length === 0, errors };
}

export const OTB_CONFIG: BulkImportConfig = {
  pageTitle: "IMPOR MASSAL OTB",
  entityType: "devices",
  deviceTypeKey: "OTB",
  assetGroup: "passive",
  templateColumns: OTB_TEMPLATE_COLUMNS,
  exampleRows: OTB_EXAMPLE_ROWS,
  instructions: OTB_INSTRUCTIONS,
  validationRules: OTB_VALIDATION_RULES,
  validateRow: validateOtbRow,
  checkPrerequisite: async (token) => {
    if (!token) return { hasData: false, count: 0, message: "Tidak ada sesi login.", entityLabel: "POP" };
    try {
      const json = await apiFetch<{ data?: { items?: unknown[] } | unknown[]; meta?: { total?: number } }>(
        "/pops?page=1&limit=1",
        { token },
      );
      const arr = Array.isArray(json?.data) ? json.data : (json?.data as { items?: unknown[] })?.items || [];
      const total = json?.meta?.total ?? arr.length;
      return {
        hasData: total > 0,
        count: total,
        message: total > 0 ? `${total} data POP tersedia.` : "Belum ada data POP.",
        entityLabel: "POP",
      };
    } catch (e) {
      return { hasData: false, count: 0, message: `Gagal cek POP: ${e instanceof Error ? e.message : e}`, entityLabel: "POP" };
    }
  },
  storageKey: "otb-bulk-import-notice-dismissed",
  requiresPop: true,
  requiresRegion: true,
  successEntityLabel: "OTB",
};

// ─── POP ───────────────────────────────────────────────────────────
export const POP_TEMPLATE_COLUMNS: ColumnDef[] = [
  { key: "pop name", label: "pop name", description: "Nama POP unik", required: true },
  { key: "pop code", label: "pop code", description: "3 huruf uppercase (opsional, auto-generate)", required: false },
  { key: "region", label: "region", description: "Nama region lengkap", required: true },
  { key: "longitude", label: "longitude", description: "Koordinat (-180..180)", required: true },
  { key: "latitude", label: "latitude", description: "Koordinat (-90..90)", required: true },
  { key: "address", label: "address", description: "Alamat lokasi", required: false },
  { key: "province", label: "province", description: "Provinsi", required: false },
  { key: "city", label: "city", description: "Kota/Kabupaten", required: false },
  { key: "status pop", label: "status pop", description: "planning/active/inactive/maintenance", required: false },
  { key: "pop type", label: "pop type", description: "Primary/Main POP/POP Outdoor/Distribution/Edge", required: false },
];

export const POP_EXAMPLE_ROWS: Record<string, string>[] = [
  { "pop name": "POP Cibubur", "pop code": "CIB", region: "Jabodebek", longitude: "106.89513", latitude: "-6.35462", address: "Jl. Raya Bogor KM 10", province: "Jawa Barat", city: "Bogor", "status pop": "active", "pop type": "Distribution" },
  { "pop name": "POP BSD", "pop code": "BSD", region: "Jabodebek", longitude: "106.65520", latitude: "-6.30100", address: "BSD City", province: "Banten", city: "Tangerang", "status pop": "active", "pop type": "Edge" },
];

const POP_VALIDATION_RULES: ValidationRule[] = [
  { rule: "pop name wajib", message: "Kolom pop name wajib diisi" },
  { rule: "pop code format 3 huruf", message: "Pop code harus 3 huruf uppercase (opsional, bisa dikosongkan)" },
  { rule: "region valid", message: "Region tidak ditemukan" },
  { rule: "longitude -180..180", message: "Longitude di luar range" },
  { rule: "latitude -90..90", message: "Latitude di luar range" },
  { rule: "status pop valid", message: "Status POP harus planning/active/inactive/maintenance" },
];

export const POP_INSTRUCTIONS: string[][] = [
  ["PETUNJUK IMPOR MASSAL POP"],
  [""],
  ["Kolom", "Keterangan"],
  ["pop name", "Nama POP unik (contoh: POP Cibubur)"],
  ["pop code", "Kode 3 huruf uppercase (contoh: CIB). Bisa dikosongkan — backend auto-generate."],
  ["region", "Nama region lengkap persis sama dengan master database"],
  ["longitude", "Koordinat desimal (-180 s/d 180)"],
  ["latitude", "Koordinat desimal (-90 s/d 90)"],
  ["address", "Alamat lengkap POP"],
  ["province", "Provinsi"],
  ["city", "Kota/Kabupaten"],
  ["status pop", "planning / active / inactive / maintenance"],
  ["pop type", "Primary / Main POP / POP Outdoor / Distribution / Edge"],
];

export function validatePopRow(row: Record<string, string>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const pn = getValue(row, "pop name");
  if (!pn) errors.push("pop name wajib diisi");

  const pc = getValue(row, "pop code");
  if (pc && !/^[A-Z]{3}$/.test(pc)) {
    errors.push("pop code harus 3 huruf uppercase");
  }

  if (!getValue(row, "region")) errors.push("region wajib diisi");

  const lng = Number(getValue(row, "longitude"));
  if (!getValue(row, "longitude") || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    errors.push("longitude harus -180..180");
  }
  const lat = Number(getValue(row, "latitude"));
  if (!getValue(row, "latitude") || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.push("latitude harus -90..90");
  }

  const sp = getValue(row, "status pop").toLowerCase();
  if (sp && !inSet(sp, new Set(["planning", "active", "inactive", "maintenance"]))) {
    errors.push("status pop harus planning/active/inactive/maintenance");
  }

  return { valid: errors.length === 0, errors };
}

export const POP_CONFIG: BulkImportConfig = {
  pageTitle: "IMPOR MASSAL POP",
  entityType: "pops",
  templateColumns: POP_TEMPLATE_COLUMNS,
  exampleRows: POP_EXAMPLE_ROWS,
  instructions: POP_INSTRUCTIONS,
  validationRules: POP_VALIDATION_RULES,
  validateRow: validatePopRow,
  checkPrerequisite: async () => ({ hasData: true, count: 0, message: "POP tidak memerlukan data pendukung.", entityLabel: "POP" }),
  storageKey: "pop-bulk-import-notice-dismissed",
  requiresPop: false,
  requiresRegion: true,
  successEntityLabel: "POP",
};

// ─── Customer ──────────────────────────────────────────────────────
export const CUSTOMER_TEMPLATE_COLUMNS: ColumnDef[] = [
  { key: "customer name", label: "customer name", description: "Nama pelanggan", required: true },
  { key: "CID", label: "CID", description: "Nomor customer (wajib diisi)", required: true },
  { key: "region", label: "region", description: "Nama region lengkap", required: true },
  { key: "POP", label: "POP", description: "Kode/nama/ID POP", required: true },
  { key: "service type", label: "service type", description: "Tipe layanan", required: true },
  { key: "installation date", label: "installation date", description: "Tanggal instalasi (YYYY-MM-DD)", required: false },
  { key: "longitude", label: "longitude", description: "Koordinat (-180..180)", required: true },
  { key: "latitude", label: "latitude", description: "Koordinat (-90..90)", required: true },
];

export const CUSTOMER_EXAMPLE_ROWS: Record<string, string>[] = [
  { "customer name": "PT. ABC Sejahtera", CID: "CUS-0001", region: "Jabodebek", POP: "INV-POP-S89P4U2", "service type": "Broadband", "installation date": "2024-06-15", longitude: "106.84513", latitude: "-6.21462" },
  { "customer name": "Ibu Siti Aminah", CID: "CUS-0002", region: "Jawa Barat", POP: "CBN", "service type": "Residential", "installation date": "", longitude: "107.61912", latitude: "-6.90389" },
];

const CUSTOMER_VALIDATION_RULES: ValidationRule[] = [
  { rule: "customer name wajib", message: "Kolom customer name wajib diisi" },
  { rule: "CID wajib", message: "Kolom CID wajib diisi" },
  { rule: "region valid", message: "Region tidak ditemukan" },
  { rule: "POP valid", message: "POP tidak valid untuk region" },
  { rule: "service type valid", message: "Service type harus sesuai master service_types" },
  { rule: "installation date valid", message: "Format tanggal harus YYYY-MM-DD (opsional)" },
  { rule: "longitude -180..180", message: "Longitude di luar range" },
  { rule: "latitude -90..90", message: "Latitude di luar range" },
];

export const CUSTOMER_INSTRUCTIONS: string[][] = [
  ["PETUNJUK IMPOR MASSAL CUSTOMER"],
  [""],
  ["Kolom", "Keterangan"],
  ["customer name", "Nama pelanggan / customer (contoh: PT. ABC Sejahtera)"],
  ["CID", "Nomor Customer ID (opsional, backend auto-generate jika kosong)"],
  ["region", "Nama region lengkap persis sama dengan master database"],
  ["POP", "Kode POP 3 huruf, nama POP, atau ID inventori (INV-POP-...)"],
  ["service type", "Tipe layanan (contoh: Broadband, Residential, Dedicated)"],
  ["installation date", "Tanggal instalasi (format YYYY-MM-DD, contoh: 2024-06-15)"],
  ["longitude", "Koordinat desimal (-180 s/d 180)"],
  ["latitude", "Koordinat desimal (-90 s/d 90)"],
];

export function validateCustomerRow(row: Record<string, string>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const cn = getValue(row, "customer name");
  if (!cn) errors.push("customer name wajib diisi");

  const cid = getValue(row, "CID");
  if (!cid) errors.push("CID wajib diisi");

  if (!getValue(row, "region")) errors.push("region wajib diisi");
  if (!getValue(row, "POP")) errors.push("POP wajib diisi");

  const st = getValue(row, "service type");
  if (!st) errors.push("service type wajib diisi");

  const instDate = getValue(row, "installation date");
  if (instDate && !/^\d{4}-\d{2}-\d{2}$/.test(instDate)) {
    errors.push("installation date harus format YYYY-MM-DD");
  }

  const lng = Number(getValue(row, "longitude"));
  if (!getValue(row, "longitude") || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    errors.push("longitude harus -180..180");
  }
  const lat = Number(getValue(row, "latitude"));
  if (!getValue(row, "latitude") || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.push("latitude harus -90..90");
  }

  return { valid: errors.length === 0, errors };
}

export const CUSTOMER_CONFIG: BulkImportConfig = {
  pageTitle: "IMPOR MASSAL CUSTOMER",
  entityType: "customers",
  templateColumns: CUSTOMER_TEMPLATE_COLUMNS,
  exampleRows: CUSTOMER_EXAMPLE_ROWS,
  instructions: CUSTOMER_INSTRUCTIONS,
  validationRules: CUSTOMER_VALIDATION_RULES,
  validateRow: validateCustomerRow,
  checkPrerequisite: async (token) => {
    if (!token) return { hasData: false, count: 0, message: "Tidak ada sesi login.", entityLabel: "POP" };
    try {
      const [popsJson, svcJson] = await Promise.all([
        apiFetch<{ data?: { items?: unknown[] } | unknown[]; meta?: { total?: number } }>("/pops?page=1&limit=1", { token }),
        apiFetch<{ data?: { items?: unknown[] } | unknown[]; meta?: { total?: number } }>("/serviceTypes?page=1&limit=1", { token }),
      ]);
      const popArr = Array.isArray(popsJson?.data) ? popsJson.data : (popsJson?.data as { items?: unknown[] })?.items || [];
      const popTotal = popsJson?.meta?.total ?? popArr.length;
      const svcArr = Array.isArray(svcJson?.data) ? svcJson.data : (svcJson?.data as { items?: unknown[] })?.items || [];
      const svcTotal = svcJson?.meta?.total ?? svcArr.length;

      if (popTotal === 0) {
        return { hasData: false, count: 0, message: "Belum ada data POP.", entityLabel: "POP" };
      }
      if (svcTotal === 0) {
        return { hasData: false, count: 0, message: "Belum ada data service type.", entityLabel: "Service Type" };
      }
      return {
        hasData: true,
        count: popTotal,
        message: `${popTotal} POP & ${svcTotal} service type tersedia.`,
        entityLabel: "POP & Service Type",
      };
    } catch (e) {
      return { hasData: false, count: 0, message: `Gagal cek prasyarat: ${e instanceof Error ? e.message : e}`, entityLabel: "POP" };
    }
  },
  storageKey: "customer-bulk-import-notice-dismissed",
  requiresPop: true,
  requiresRegion: true,
  requiresServiceType: true,
  successEntityLabel: "Customer",
};
