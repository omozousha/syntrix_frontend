# Rencana Perbaikan Relasi Device Topology

> **Dibuat:** 2026-07-06
> **Terakhir update:** 2026-07-06 (final)
>
> **Tujuan:** Memperbaiki gaps di mana field topology device tidak tersimpan ke database, baik karena frontend tidak mengirim payload, backend tidak menerima registry, atau topology lookup tidak di-fetch.

---

## 📋 Ringkasan Masalah & Status

| # | Prioritas | Gap | Status |
|:-:|:---------:|:----|:------:|
| 1 | 🔴 P1 | `buildEditableForm()` tidak populate field **ODP** | ✅ SELESAI |
| 2 | 🔴 P1 | `buildUpdatePayload()` tidak kirim field **ODP** | ✅ SELESAI |
| 3 | 🔴 P1 | `topologyLookup={undefined}` | ✅ SELESAI |
| 4 | 🟡 P2 | `buildUpdatePayload()` tidak kirim `feeder_port_count`, `distribution_port_count` (ODC) | ✅ SELESAI |
| 5 | 🟡 P2 | `buildUpdatePayload()` tidak kirim `uplink_switch_id`, `uplink_router_id` (OLT) | ✅ SELESAI |
| 6 | 🟡 P2 | Backend registry tidak punya `uplink_switch_id`, `uplink_router_id` | ✅ SELESAI (+ migrasi DB) |
| 7 | 🟡 P2 | `buildEditableForm()` tidak populate field OLT + ODC port count | ✅ SELESAI |
| 8 | 🟢 P3 | Duplikasi endpoint di `device.routes.js` (odc-chain-summary, trace, topology/trace) | ✅ SELESAI |

---

## ✅ Sudah Berfungsi (Tidak Perlu Diubah)

| Device | Mekanisme | Status |
|:-------|:----------|:-------|
| **JC** | Via `specifications` JSONB | ✅ Tersimpan |
| **ODC upstream** | Via port_connections API di `handleSave()` | ✅ Tersimpan |
| **CABLE (route_name, route_type, dll.)** | Langsung di `devices` table | ✅ Tersimpan |

---

## 🎯 Lingkup Perubahan

### File yang Diubah

| File | Perubahan | Status |
|:-----|:----------|:-------|
| `syntrix_frontend/app/(app)/data-management/list/[slug]/[id]/page.tsx` | 3 fungsi: `buildEditableForm`, `buildUpdatePayload`, `topologyLookup` | ✅ **SELESAI** |
| `syntrix_backend/src/modules/resource/resource.registry.js` | Tambah field OLT ke `insertFields`/`updateFields`/`listFields` | ✅ **SELESAI** |
| `syntrix_backend/src/modules/device/device.routes.js` | Hapus 3 endpoint duplikasi + cleanup import | ✅ **SELESAI** |
| `syntrix_backend/database/migrations/20260706_add_olt_uplink_fields_to_devices.sql` | Migration baru untuk OLT fields | ✅ **SELESAI** |

---

## ✅ Todo Checklist — Final

### Phase 1: Frontend `page.tsx` — Semua Field Topology

- [x] **1a.** `buildEditableForm()` — Tambah `source_odc_id`, `source_odc_port_id`, `feeder_cable_id`, `feeder_core_start`, `feeder_core_end`
- [x] **1a.** `buildEditableForm()` — Tambah `uplink_switch_id`, `uplink_router_id`
- [x] **1a.** `buildEditableForm()` — Tambah `feeder_port_count`, `distribution_port_count`
- [x] **1b.** `buildUpdatePayload()` — Tambah `source_odc_id`, `source_odc_port_id`, `feeder_cable_id`, `feeder_core_start`, `feeder_core_end`
- [x] **1b.** `buildUpdatePayload()` — Tambah `uplink_switch_id`, `uplink_router_id`
- [x] **1b.** `buildUpdatePayload()` — Tambah `feeder_port_count`, `distribution_port_count`
- [x] **1c.** Ganti `topologyLookup={undefined}` → fetch data ODC devices + routes + ports per region
- [x] **1c.** Add state `topologyLookupData` dengan `emptyTopologyLookup()`
- [x] **1c.** Add `useEffect` untuk fetch lookup data (ODC devices, routes, ports)

### Phase 2: Backend Registry + Migration

- [x] **2a.** Migration SQL — Buat file `20260706_add_olt_uplink_fields_to_devices.sql` (kolom `uplink_switch_id`, `uplink_router_id` + FK + index)
- [x] **2b.** Tambah `uplink_switch_id`, `uplink_router_id` ke `insertFields` devices
- [x] **2b.** Tambah `uplink_switch_id`, `uplink_router_id` ke `updateFields` devices
- [x] **2b.** Tambah `uplink_switch_id`, `uplink_router_id` ke `listFields` devices
- [x] **2c.** Migration SQL sudah dijalankan oleh user ke database

### Phase 3: Backend Device Routes — Hapus Duplikasi

- [x] **3a.** Verifikasi `buildOdcCoreChainSummary` hanya dipakai di endpoint duplikat
- [x] **3a.** Hapus 3 endpoint duplikasi: `odc-chain-summary`, `/devices/:id/trace`, `/topology/trace`
- [x] **3a.** Hapus unused imports (`buildOdcCoreChainSummary`, `resolveTraceEndpoint`, `loadPortConnections`, dll.)

### Phase 4: Verifikasi

- [x] **4a.** Typecheck frontend (`npx tsc --noEmit`) — ✅ **Lulus tanpa error**

---

## 📊 Status Perubahan per File

### `page.tsx` — ✅ Semua Perubahan Selesai

| Perubahan | Detail |
|:----------|:-------|
| Import | `TopologyLookupData`, `emptyTopologyLookup`, `DeviceLookupOption`, `RouteLookupOption`, `PortLookupOption` dari device-topology-helpers |
| State baru | `topologyLookupData` diinisialisasi dengan `emptyTopologyLookup()` |
| useEffect baru | `loadTopologyLookups()` — fetch ODC devices, routes, ports per region |
| Prop | `topologyLookup={undefined}` → `topologyLookup={topologyLookupData}` |
| `buildEditableForm` | ✅ ODP (5 fields) + OLT (2 fields) + ODC port count (2 fields) |
| `buildUpdatePayload` | ✅ ODP (5 fields) + OLT (2 fields) + ODC port count (2 fields) |

### `device.routes.js` — 3 Endpoint Dihapus

| Endpoint | Baris (sebelum) | Alasan |
|:---------|:----------------:|:-------|
| `GET /devices/:id/odc-chain-summary` | 396-415 | Duplikat dari `resource.routes.js` |
| `GET /devices/:id/trace` | 417-432 | Duplikat (redirect) — sudah di `resource.routes.js` |
| `GET /topology/trace` | 434-574 | Duplikat dari `resource.routes.js` (full logic) |

### `resource.registry.js` — 2 Field Ditambahkan

| Field | insertFields | updateFields | listFields |
|:------|:------------:|:------------:|:----------:|
| `uplink_switch_id` | ✅ | ✅ | ✅ |
| `uplink_router_id` | ✅ | ✅ | ✅ |

### Migration SQL Baru

| File | Isi |
|:-----|:-----|
| `database/migrations/20260706_add_olt_uplink_fields_to_devices.sql` | `ALTER TABLE devices ADD COLUMN uplink_switch_id uuid REFERENCES devices(id)` + `uplink_router_id` + index partial |

---

## 🏷️ Referensi Kode

| Elemen | File | Baris (approx.) |
|:-------|:-----|:----------------|
| `buildEditableForm` | `page.tsx` | ~3571 |
| `buildUpdatePayload` | `page.tsx` | ~3651 |
| `topologyLookup` prop | `page.tsx` | ~2150 |
| `loadTopologyLookups` effect | `page.tsx` | ~1151 |
| `emptyTopologyLookup()` | `device-topology-helpers.tsx` | ~66 |
| Registry devices `insertFields` | `resource.registry.js` | ~68 |
| Registry devices `updateFields` | `resource.registry.js` | ~69 |
| Migration OLT fields | `database/migrations/20260706_add_olt_uplink_fields_to_devices.sql` | - |
