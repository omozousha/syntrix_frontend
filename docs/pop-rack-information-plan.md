# POP Rack Information — Tata Letak Perangkat dalam POP

> **Companion to:** `docs/device-list-pop-filter-plan.md`, `docs/odc-validation-and-odp-relation-workflow-plan.md`, `docs/network-inventory-relation-development-plan.md`
> **Status:** Planning
> **Diperbarui:** 2026-06-25

---

## 1. Tujuan

Mendokumentasikan standar informasi rack dan tata letak perangkat dalam **POP (Point of Presence)** untuk memastikan:

1. Setiap perangkat yang berada di POP (OLT, OTB, SWITCH, ROUTER, RECTIFIER, dll.) tercatat posisi rack-nya dengan jelas.
2. Operator dapat memahami layout fisik POP tanpa harus datang ke lapangan.
3. Rack menjadi container fisik yang terstandarisasi — kapasitas U, tipe rack, posisi perangkat.
4. Relasi topology fiber optik (OTB → ODC → ODP) tetap terpisah dari informasi rack; rack adalah **fisik placement**, bukan topology jaringan.

### Domain Boundaries

| ✅ **In Scope** | ❌ **Out of Scope** |
|----------------|-------------------|
| Informasi rack fisik (tipe, kapasitas U, posisi) | Topologi jaringan fiber optik |
| Posisi perangkat dalam rack (U position) | Routing / IP addressing |
| Dimensi rack, tipe cabinet | Cable management / patch panel detail |
| Informasi daya (PLN, rectifier, battery) | Live power monitoring / NMS |
| Informasi POP site secara umum | Customer assignment / service provisioning |
| Cooling / pendingin ruang | Environmental monitoring (suhu real-time) |
| Dokumentasi foto rack | GIS / map integration |

---

## 2. Konsep Rack dalam POP

### 2.1 Rack Sebagai Container Fisik

Dalam konteks Syntrix, **Rack** adalah device dengan `device_type_key = 'RACK'` yang berfungsi sebagai:

- Container fisik untuk perangkat aktif (OLT, SWITCH, ROUTER, RECTIFIER) dan pasif (OTB, DDF/ODF panel).
- Unit organisasi tata letak POP — operator dapat melihat perangkat apa saja yang terpasang dalam satu rack.
- Dasar untuk perencanaan kapasitas POP (berapa U terpakai, berapa tersisa).

### 2.2 Hirarki POP

```text
POP (Point of Presence)
├── Informasi Site
│   ├── Nama POP, Kode POP, Alamat
│   ├── Region, Provinsi, Kota
│   ├── Koordinat (Lat/Lng)
│   ├── Tipe POP (Indoor, Outdoor, Shelter, Dll.)
│   └── Status POP (Planning, Active, Inactive, Maintenance)
│
├── Infrastruktur Fisik
│   ├── Gedung / Shelter
│   │   ├── Ruang (Room) — jika POP memiliki multiple rooms
│   │   └── Sistem Keamanan, Akses, Kebersihan
│   │
│   ├── Rack / Cabinet
│   │   ├── Rack 01 — 42U Standard
│   │   │   ├── U1-U2:  OLT #1 (2U)
│   │   │   ├── U3-U4:  OLT #2 (2U)
│   │   │   ├── U5-U6:  OTB (2U patch panel)
│   │   │   ├── U7:     SWITCH #1 (1U)
│   │   │   ├── U8:     SWITCH #2 (1U)
│   │   │   ├── U9-U10: ROUTER (2U)
│   │   │   ├── U11-U12: RECTIFIER (2U)
│   │   │   ├── U13-U14: BATTERY CHARGER (2U)
│   │   │   └── U15-U42: (available / reserved)
│   │   │
│   │   └── Rack 02 — 42U Standard
│   │       ├── U1-U2:  OLT #3 (2U)
│   │       ├── U3-U24: ODF Panel / DDF (22U)
│   │       └── U25-U42: (available)
│   │
│   └── Perangkat Belum Terpasang
│       └── (belum dimount ke rack tertentu)
│
├── Kelistrikan & Daya
│   ├── PLN: CID Number, Payment Method, Phase, Wattage
│   ├── Rectifier / Power Supply
│   ├── Battery Bank / UPS
│   └── Panel Distribusi
│
└── Dokumentasi
    ├── Foto Site / Gedung
    ├── Foto Rack (Front View)
    ├── Foto Rack (Inside)
    └── Foto Label / QR
```

### 2.3 Relasi dengan Topologi Jaringan Penting

> **Peringatan:** Informasi rack adalah **fisik placement**, bukan topology jaringan.

Informasi rack menjawab: **"Di POP mana perangkat ini berada dan di rack mana?"**

Informasi topology jaringan menjawab: **"Perangkat ini terhubung ke perangkat apa secara optik/listrik?"**

Keduanya terpisah:

| Aspek | Rack (device_type_key='RACK') | Topologi (port_connections) |
|-------|-------------------------------|-----------------------------|
| Pertanyaan | Di rack mana OLT ini? | OLT ini terhubung ke ODC mana? |
| Data | `specifications.rack_device_id` | `port_connections.from_device_id → to_device_id` |
| Tujuan | Layout fisik POP | Jaringan fiber optik |
| Visualisasi | Rack view (vertical U slots) | Topology trace (graph nodes) |

---

## 3. Field Standar Rack

### 3.1 Device Base (inherited dari device umum)

| Field | Key | Tipe | Contoh |
|-------|-----|------|--------|
| Nama Rack | `device_name` | text | "Rack 01" atau "Cabinet A" |
| Device Type Key | `device_type_key` | enum | `RACK` |
| Asset Group | `asset_group` | enum | `passive` |
| Status | `status` | enum | `installed`, `active` |
| Region | `region_id` | uuid FK | — |
| POP | `pop_id` | uuid FK | — |
| Room | `room_id` | uuid FK (opsional) | Jika POP punya beberapa ruang |

### 3.2 Specifications (Rack-Specific)

Disimpan di `specifications` JSONB field pada device:

| Field | Key | Tipe | Default | Contoh |
|-------|-----|------|---------|--------|
| Tinggi Rak | `rack_u_height` | integer | `42` | `12`, `20`, `30`, `42`, `45`, `48` |
| Lebar Rak | `rack_width_inches` | integer | `19` | `19` (standard), `23` |
| Tipe Rak | `rack_type` | text | `closed_cabinet` | `closed_cabinet`, `open_frame`, `wall_mount`, `outdoor_cabinet` |
| Manufacturer | `manufacturer` | text | — | "Huawei", "Vertiv", "Rittal" |
| Model | `model` | text | — | "SmartCabinet S" |
| Serial Number | `serial_number` | text | — | — |
| Nomor Rak | `rack_number` | text | — | "R-001", "A-01" |
| Posisi Row | `rack_row` | text | — | "A", "B", "C" |
| Posisi Kolom | `rack_column` | integer | — | `1`, `2`, `3` |
| Kapasitas Maks Daya (W) | `max_power_watts` | integer | — | `3000` |
| Tipe Pendingin | `cooling_type` | text | — | `fan`, `ac`, `passive` |
| Catatan | `notes` | text | — | "Rack ini dekat pintu" |

### 3.3 Mounted Device Fields

Setiap device yang dimount ke rack menyimpan informasi berikut di `specifications`:

| Field | Key | Tipe | Contoh |
|-------|-----|------|--------|
| Rack ID | `rack_device_id` | uuid | `id` dari device RACK |
| Posisi U Awal | `rack_unit_position` | integer | `1` (berarti U1) |
| Tinggi Device (U) | `u_height` | integer | `1` (1U), `2` (2U), `4` (4U) |

**Aturan:**
- `rack_unit_position` = posisi U paling bawah device dalam rack.
- `u_height` = jumlah U yang ditempati device.
- Contoh: Device dengan `rack_unit_position: 3` dan `u_height: 2` menempati U3 dan U4.
- Satu slot U tidak boleh diisi oleh lebih dari satu device.

---

## 4. Tipe Perangkat dalam Rack

### 4.1 OLT (Optical Line Terminal)

Perangkat aktif di sisi operator, head-end jaringan GPON/EPON.

| Informasi | Detail |
|-----------|--------|
| **Device Type Key** | `OLT` |
| **Tinggi Rack (U)** | Biasanya 2U–6U tergantung model |
| **Fungsi** | Mengkonversi sinyal listrik ke optik, mengirim downstream ke ODC/ODP |
| **Koneksi** | Uplink via SFP+ ke router/switch, Downstream via PON port ke ODC |
| **Field Teknis** | `management_ip`, `pon_port_count`, `uplink_port_count`, `capacity_core`, `used_core` |

**Contoh dalam Rack:**
```text
Rack 01 (42U)
┌──────────────────────────┐
│  U1-U2  │ OLT Huawei MA5608T  (2U) │
│  U3-U4  │ OLT Huawei MA5608T  (2U) │
│  U5     │ Switch Uplink       (1U) │
└──────────────────────────┘
```

**Validation Form (Opsional):**
- Konfirmasi POP/site
- Konfirmasi rack/slot position
- PON port status
- Uplink status
- Evidence photos

### 4.2 OTB (Optical Termination Box) / ODF Panel

Perangkat pasif sebagai titik terminasi kabel fiber di POP.

| Informasi | Detail |
|-----------|--------|
| **Device Type Key** | `OTB` |
| **Tinggi Rack (U)** | 1U–4U tergantung kapasitas port |
| **Fungsi** | Terminasi kabel feeder dari luar POP, patch panel untuk distribusi ke ODC |
| **Kapasitas** | 24, 48, 96, atau 144 core |
| **Koneksi** | Feeder dari arah luar POP, Distribusi ke ODC via port_connections |

**Contoh dalam Rack:**
```text
Rack 01 (42U)
┌──────────────────────────┐
│  U6-U7  │ OTB 48 Core (ODF Panel) (2U) │
│  U8-U9  │ OTB 96 Core (ODF Panel) (2U) │
└──────────────────────────┘
```

**Field Teknis OTB:**
| Field | Key | Tipe |
|-------|-----|------|
| Kapasitas Core | `capacity_core` | number |
| Used Core | `used_core` | number |
| Tipe Konektor | `connector_type` | text (SC/UPC, SC/APC, LC) |
| Jumlah Slot Tray | `tray_slot_count` | number |
| Posisi Rack | *(dari specifications)* | rack_device_id + rack_unit_position |

### 4.3 SWITCH

Perangkat aktif jaringan layer 2/3 untuk distribusi traffic IP dalam POP.

| Informasi | Detail |
|-----------|--------|
| **Device Type Key** | `SWITCH` |
| **Tinggi Rack (U)** | 1U (standard), ada juga 2U untuk model high-density |
| **Fungsi** | Distribusi traffic IP antar perangkat dalam POP |
| **Koneksi** | Uplink ke router, Downlink ke OLT, server, dll. |

**Contoh dalam Rack:**
```text
Rack 01 (42U)
┌──────────────────────────┐
│  U5     │ Switch Distribution (1U)     │
│  U10    │ Switch Core (1U)             │
└──────────────────────────┘
```

**Field Teknis SWITCH:**
| Field | Key | Tipe |
|-------|-----|------|
| Management IP | `management_ip` | string |
| Interface Count | `total_ports` | number |
| Used Interface | `used_ports` | number |
| Uplink Device | `uplink_device_id` | uuid (opsional, topology relation) |

### 4.4 ROUTER

Perangkat aktif layer 3 untuk routing antar jaringan.

| Informasi | Detail |
|-----------|--------|
| **Device Type Key** | `ROUTER` |
| **Tinggi Rack (U)** | 1U–2U |
| **Fungsi** | Routing traffic antar POP / ke backbone utama |
| **Koneksi** | Uplink ke backbone, Downlink ke switch distribusi |

### 4.5 RECTIFIER & Power System

Sistem kelistrikan dan daya untuk perangkat aktif di POP.

| Informasi | Detail |
|-----------|--------|
| **Device Type Key** | `RECTIFIER` |
| **Tinggi Rack (U)** | 2U–6U tergantung kapasitas |
| **Fungsi** | Konversi AC ke DC, pengisian battery, distribusi daya ke perangkat |
| **Komponen Terkait** | Battery Bank, Panel AC/DC, ATS (Automatic Transfer Switch) |

**Field Teknis RECTIFIER:**
| Field | Key | Tipe | Catatan |
|-------|-----|------|---------|
| Kapasitas Daya (W) | `power_capacity_watts` | number | Total kapasitas rectifier |
| Tegangan Output | `output_voltage` | text | `-48V DC` (standard) |
| Jumlah Modul | `module_count` | number | Jumlah rectifier module terpasang |
| Kapasitas Battery | `battery_capacity_ah` | number | Ampere-hour battery bank |
| Tipe Battery | `battery_type` | text | VRLA, Lithium, NiCd |

**Informasi daya tingkat POP (disimpan di tabel `pops`):**
| Field | Tipe | Contoh |
|-------|------|--------|
| `pln_cid_number` | text | Nomor CID PLN |
| `pln_payment_method` | text | Pascabayar, Prabayar |
| `pln_phase` | text | 1 Phase, 3 Phase |
| `pln_wattage` | integer | 2200, 4400, 5500, 7700 |

### 4.6 Battery Bank / UPS

| Informasi | Detail |
|-----------|--------|
| **Device Type Key** | `RECTIFIER` atau device type terpisah |
| **Tinggi Rack (U)** | 2U–4U untuk UPS, bisa floor-standing untuk battery besar |
| **Fungsi** | Backup daya saat PLN padam |

### 4.7 Perangkat Tambahan

| Device Type | Tinggi (U) | Fungsi |
|-------------|-----------|--------|
| **DDF** (Digital Distribution Frame) | 1U–4U | Terminasi kabel Tembaga/E1 |
| **PATCH PANEL** | 1U | Panel patch RJ45 / fiber |
| **CABLE MANAGEMENT** | 1U | Finger duct / cable manager horizontal |
| **SERVER** | 1U–4U | Server NMS, DHCP, dll. (jarang di POP) |
| **NMS / MONITORING** | 1U | Appliance monitoring |

---

## 5. Standar Kapasitas Rack

### 5.1 Ukuran Rack Standard

| Tipe Rack | Tinggi (U) | Lebar | Kedalaman | Penggunaan |
|-----------|-----------|-------|-----------|------------|
| Wallmount | 6U–12U | 19" | 400–600mm | POP kecil, outdoor cabinet |
| Standar 19" | 42U | 19" | 800–1000mm | POP menengah (standard) |
| Standar 19" | 45U–48U | 19" | 1000–1200mm | POP besar |
| Open Frame | 42U–48U | 19" | 600–800mm | Shelter, POP dengan AC baik |
| Outdoor Cabinet | 12U–42U | 19" | 600–800mm | POP outdoor, pedestal |

### 5.2 Alokasi U per Perangkat (Typical)

| Perangkat | Tinggi (U) | Catatan |
|-----------|-----------|---------|
| OLT (Huawei MA5600 series) | 2U–3U | Tergantung jumlah card |
| OLT (ZTE C300/600) | 2U–6U | Tergantung chassis |
| OTB / ODF Panel (48 core) | 2U | 24 port duplex SC |
| OTB / ODF Panel (96 core) | 4U | 48 port duplex SC |
| SWITCH (48 port) | 1U | Standard |
| SWITCH (modular) | 2U–4U | Dengan line cards |
| ROUTER (enterprise) | 1U–2U | Standard |
| ROUTER (carrier) | 2U–4U | Modular chassis |
| RECTIFIER Module | 1U–3U | Tergantung kapasitas |
| PATCH PANEL (RJ45 24 port) | 1U | Standard |
| PATCH PANEL (Fiber 12/24 LC) | 1U–2U | Standard |
| CABLE MANAGEMENT | 1U | Horizontal |

### 5.3 Tips Alokasi Rack

```text
POP Tipikal — Rack 01 (42U)

┌─────────────────────────────────┐
│  U1-U4 │  OLT #1 (4U)          │  ← Perangkat aktif utama
│  U5     │  SWITCH Core (1U)     │  ← Jaringan distribusi
│  U6     │  PATCH PANEL (1U)     │  ← Panel patch fiber
│  U7     │  CABLE MGMT (1U)      │  ← Manajemen kabel
│  U8-U9  │  OTB 48 Core (2U)     │  ← Terminasi fiber
│  U10    │  CABLE MGMT (1U)      │
│  U11-U12│  ROUTER (2U)          │  ← Router backbone
│  U13    │  SWITCH Distribusi(1U)│
│  U14    │  PATCH PANEL (1U)     │
│  U15-U16│  OTB 48 Core (2U)     │  ← Terminasi fiber
│  U17-U20│  RECTIFIER (4U)       │  ← Power system
│  U21-U22│  BATTERY CHARGER(2U)  │
│  ...    │  (available)          │
│  U42    │  (available)          │
└─────────────────────────────────┘
```

---

## 6. Visualisasi Rack — Rack View

### 6.1 Front View (Tampilan Depan)

Representasi visual rack dari depan, menampilkan:

- Seluruh slot U dari bawah (U1) ke atas (U42).
- Setiap perangkat yang sudah dimount dengan label nama dan tipe.
- Warna berbeda per tipe perangkat:
  - 🔵 **Biru** → OLT
  - 🟢 **Hijau** → SWITCH
  - 🟠 **Oranye** → OTB / ODF
  - 🟤 **Coklat** → RECTIFIER
  - 🟣 **Ungu** → ROUTER
  - ⚪ **Abu-abu** → Lainnya (panel, management, dll.)
- Slot kosong yang bisa diklik untuk menambah device.
- Header rack dengan nama, kapasitas total U, dan jumlah perangkat terpasang.

### 6.2 Informasi Perangkat dalam Rack

Setiap perangkat yang terpasang menampilkan:

- **Nama Perangkat** (truncate jika terlalu panjang)
- **Device Type Badge** (OLT, OTB, SWITCH, dll.)
- **Posisi U** (contoh: U1-U2)
- **Tinggi U** (contoh: 2U)
- **Action button**: Lihat detail, Lepas dari rack

### 6.3 Empty State

Jika POP belum memiliki rack:
- Ilustrasi server rack kosong
- Petunjuk: "Buat Rack kabinet baru terlebih dahulu"

Jika rack tidak memiliki perangkat terpasang:
- Semua slot kosong
- Bisa klik slot untuk mount device

### 6.4 Panel "Perangkat Belum Terpasang"

Sidebar yang menampilkan semua device di POP yang belum dimount ke rack mana pun. Berguna untuk:

- Mengetahui perangkat mana yang belum tertata.
- Memudahkan mounting batch.
- Menampilkan perangkat yang baru dibuat/ditambahkan ke POP.

---

## 7. Field POP (Site Level)

Informasi yang disimpan di tabel `pops` (site level):

### 7.1 Identitas POP

| Field | Tipe | Contoh |
|-------|------|--------|
| `pop_id` | text | BGR-001 |
| `pop_name` | text | POP Kandanghaur |
| `pop_code` | text | BGR (3 uppercase letters) |
| `pop_type_id` | uuid FK | Referensi ke `pop_types` |
| `region_id` | uuid FK | Region POP berada |
| `status_pop` | enum | planning, active, inactive, maintenance |
| `validation_status` | enum | unvalidated, valid, warning, invalid |

### 7.2 Lokasi

| Field | Tipe |
|-------|------|
| `address` | text |
| `province_id` | uuid FK |
| `city_id` | uuid FK |
| `latitude` | numeric(10,7) |
| `longitude` | numeric(10,7) |

### 7.3 Kelistrikan

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `pln_cid_number` | text | Nomor Customer ID PLN |
| `pln_payment_method` | text | Pascabayar / Prabayar |
| `pln_phase` | text | 1 Phase / 3 Phase |
| `pln_wattage` | integer | Daya PLN (VA/Watt) |

### 7.4 Tenant & Operasional

| Field | Tipe |
|-------|------|
| `tenant` | text |
| `tanggal_pop_aktif` | date |
| `support_doc` | jsonb |
| `image_attachments` | jsonb |

### 7.5 Master Data POP Types

Tabel `pop_types`:

| Field | Tipe | Contoh |
|-------|------|--------|
| `pop_type_code` | text | INDOOR, OUTDOOR, SHELTER, BTS |
| `pop_type_name` | text | Indoor, Outdoor Cabinet, Shelter, BTS |
| `description` | text | Deskripsi tipe POP |
| `sort_order` | integer | Urutan tampilan |
| `is_active` | boolean | Aktif / tidak |

---

## 8. Alur Kerja

### 8.1 Membuat Rack Baru

1. Buka detail POP.
2. Buka tab/section **"Rack & Tata Letak Perangkat"**.
3. Klik **"Tambah Rack Baru"**.
4. Isi:
   - Nama Rack (contoh: "Rack 01")
   - Tinggi Rak (U) (default: 42U)
   - (Opsional) Tipe Rack, Manufacturer, dll.
5. Klik **"Tambah"**.
6. Rack baru muncul sebagai device `RACK` di POP tersebut.

### 8.2 Mount Perangkat ke Rack

1. Dari detail POP, buka **"Rack & Tata Letak Perangkat"**.
2. Pilih rack tujuan.
3. Klik slot U kosong yang diinginkan.
4. Pilih device dari daftar **"Perangkat Belum Terpasang"**.
5. Tentukan:
   - Posisi Mulai U (contoh: U1)
   - Tinggi Device (U) (contoh: 2U untuk OLT)
6. Klik **"Mount Perangkat"**.
7. Device terpasang di posisi tersebut. Konflik slot (overlap) akan ditolak.

### 8.3 Unmount / Lepas Perangkat dari Rack

1. Dari rack view, klik ikon **"Lepas"** pada perangkat.
2. Konfirmasi pelepasan.
3. Perangkat kembali ke daftar **"Perangkat Belum Terpasang"**.
4. Informasi `rack_device_id`, `rack_unit_position`, dan `u_height` dihapus dari specifications device.

### 8.4 Hapus Rack

1. Klik ikon **"Hapus"** pada header rack.
2. Konfirmasi: semua perangkat di dalam rack akan di-unmount secara otomatis.
3. Rack dihapus dari database.

### 8.5 Membuat Relasi Topologi dari Perangkat dalam Rack

Relasi topology (port connections) tidak dibuat dari rack view. Rack view hanya untuk layout fisik. Untuk membuat relasi:

1. Buka detail perangkat (OLT, OTB, dll.).
2. Gunakan action **"Create Connection"** atau topology management.
3. Lihat dokumen `docs/odc-validation-and-odp-relation-workflow-plan.md` untuk detail relasi OTB → ODC → ODP.

---

## 9. Data Model Backend

### 9.1 Tabel `devices`

Rack adalah device biasa dengan `device_type_key = 'RACK'`:

```sql
-- Rack-specific fields disimpan di specifications JSONB:
-- {
--   "rack_u_height": 42,
--   "rack_width_inches": 19,
--   "rack_type": "closed_cabinet",
--   "manufacturer": "Rittal",
--   "model": "TS 8",
--   "max_power_watts": 3000,
--   "cooling_type": "fan"
-- }
```

### 9.2 Mount Relationship

Relasi device → rack disimpan di `specifications` device yang dimount:

```json
{
  "rack_device_id": "uuid-of-rack-device",
  "rack_unit_position": 1,
  "u_height": 2
}
```

Tidak ada tabel pivot terpisah — mount relationship adalah bagian dari specifications device. Alasan:

- Setiap device hanya bisa di satu rack dalam satu waktu.
- Tidak perlu join tabel tambahan untuk query "device X ada di rack mana?".
- Unmount = hapus 3 field dari specifications.

### 9.3 Query Contoh

```sql
-- Semua rack dalam suatu POP
SELECT * FROM devices
WHERE pop_id = '<pop_id>'
  AND device_type_key = 'RACK'
  AND deleted_at IS NULL;

-- Semua device dalam suatu rack (dengan parsing JSONB)
SELECT * FROM devices
WHERE specifications->>'rack_device_id' = '<rack_id>'
  AND deleted_at IS NULL
ORDER BY (specifications->>'rack_unit_position')::int ASC;

-- Semua device yang belum terpasang dalam suatu POP
SELECT * FROM devices
WHERE pop_id = '<pop_id>'
  AND device_type_key != 'RACK'
  AND (specifications IS NULL
       OR specifications->>'rack_device_id' IS NULL
       OR specifications->>'rack_device_id' = '')
  AND deleted_at IS NULL;
```

### 9.4 API Endpoints

Menggunakan generic resource endpoints yang sudah ada:

| Kebutuhan | Endpoint | Method |
|-----------|----------|--------|
| List rack dalam POP | `/devices?pop_id=x&device_type_key=RACK` | GET |
| Buat rack baru | `/devices` | POST |
| Mount device ke rack | `/devices/:id` (PATCH specifications) | PATCH |
| Unmount device dari rack | `/devices/:id` (PATCH specifications) | PATCH |
| Hapus rack | `/devices/:id` | DELETE |

> **Tidak ada endpoint baru** — semua reuse resource `devices` yang sudah ada.

---

## 10. Frontend Components

### 10.1 PopRackLayoutSection

**Lokasi:** `components/features/data-management/pop-rack-layout-section.tsx`  
**Status:** ✅ Implemented

Component utama untuk menampilkan dan mengelola rack dalam POP.

**Fitur:**
- Grid rack cards dengan rack view visual.
- Slot U yang merespons klik untuk mount device.
- Sidebar perangkat belum terpasang.
- Modal create rack, mount device, confirm delete rack.

**Props:**
```typescript
interface PopRackLayoutSectionProps {
  devices: any[];       // Semua device dalam POP
  popId: string;
  regionId: string;
  token: string;
  onRefresh: () => void;
}
```

### 10.2 Integrasi di Halaman POP

`PopRackLayoutSection` diintegrasikan di detail POP page sebagai section terpisah, biasanya setelah informasi umum POP dan sebelum topology summary.

---

## 11. Open Decisions

| # | Keputusan | Opsi | Rekomendasi |
|---|-----------|------|-------------|
| 1 | Room di dalam POP | (a) Tidak perlu, rack langsung di POP; (b) Tambah field `room_id` di device | **(a)** Awal tidak perlu room, langsung rack → POP. Jika nanti POP besar butuh room, bisa tambah `room_id` di device. |
| 2 | Cable management panel | (a) Sebagai device terpisah; (b) Sebagai properti rack | **(a)** Device terpisah dengan device_type_key `CABLE_MANAGEMENT`. |
| 3 | Power port pada rack | (a) Sebagai device_ports rack; (b) Di specifications rack | **(a)** Lebih eksplisit, tapi tidak urgent. Skip untuk MVP. |
| 4 | Cooling / AC unit | (a) Sebagai device terpisah; (b) Field di specifications rack | **(a)** Device terpisah dengan device_type_key (misal `AC_UNIT`), karena butuh informasi kapasitas BTU, konsumsi daya, dll. |
| 5 | DDF / Tembaga panel | (a) Sama seperti OTB dengan device_type_key terpisah; (b) Satu tipe dengan OTB | **(a)** Device_type_key `DDF` terpisah karena fungsi berbeda (tembaga vs fiber). |

---

## 12. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Rack dianggap sebagai topology node | Medium | Dokumentasi jelas: rack adalah fisik placement, bukan topology. Topology via port_connections. |
| Konflik slot U tidak terdeteksi | Medium | Validasi overlap di frontend (cek U range). Backend validation bisa ditambah nanti. |
| Device dipindah antar rack tanpa update | Medium | UI mount/unmount hanya lewat POP rack section, bukan update specifications manual. |
| Rack tidak punya standardisasi tipe | Rendah | Gunakan `rack_type` enum: `closed_cabinet`, `open_frame`, `wall_mount`, `outdoor_cabinet`. |
| Perangkat aktif vs pasif tercampur | Rendah | Tidak masalah — rack adalah container fisik. Perangkat aktif dan pasif bisa dalam satu rack. |

---

## 13. Definition of Done

Fitur POP rack information dianggap selesai jika:

- [ ] Setiap POP dapat memiliki 0..N rack (device_type_key=RACK).
- [ ] Setiap rack memiliki kapasitas U (default 42U) dan lebar (default 19").
- [ ] Setiap perangkat dalam POP bisa di-mount ke rack dengan posisi U yang valid.
- [ ] Konflik slot U (overlap) terdeteksi dan ditolak.
- [ ] Rack view menampilkan visual slot dengan perangkat terpasang berwarna sesuai tipe.
- [ ] Sidebar perangkat belum terpasang menampilkan device yang belum di-mount.
- [ ] Create rack, mount, unmount, hapus rack berfungsi penuh.
- [ ] Relasi rack tidak memengaruhi topology jaringan (port_connections).
- [ ] Informasi daya POP (PLN CID, phase, wattage) tercatat di data POP.
- [ ] Dokumentasi ini selesai dan bisa diakses oleh tim operasional.

---

## 14. Referensi

- [Device List POP Filter Plan](./device-list-pop-filter-plan.md)
- [ODC Validation and ODP Relation Workflow Plan](../syntrix_backend/docs/odc-validation-and-odp-relation-workflow-plan.md)
- [Generic Device Detail and Validation Workflow Plan](../syntrix_backend/docs/generic-device-detail-and-validation-workflow-plan.md)
- [Network Inventory Relation Development Plan](../syntrix_backend/docs/network-inventory-relation-development-plan.md)
- [POP Resource Registry](../syntrix_backend/src/modules/resource/resource.registry.js) (backend)
- [PopRackLayoutSection Component](./components/features/data-management/pop-rack-layout-section.tsx) (frontend)
