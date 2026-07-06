# Device Form Refactor Plan — Per-Device-Type Forms

> **Companion to:** `docs/frontend-scalable-architecture-refactor-plan.md`
> **Status:** Phase G ✅ — Typed EditableForm: DeviceBaseForm + DeviceForm + 8 extended types
> **Diperbarui:** 2026-06-26 — Phase G completed (DeviceBaseForm, DeviceForm, typed form interfaces)
> **Next:** Phase H (Route Adjust) atau Create Form topology sections

---

## 1. Tujuan

Memecah form create dan detail device dari **satu form untuk semua device type** menjadi **form spesifik per device type** agar:

1. Setiap device type bisa punya layout, field, dan validasi yang **benar-benar berbeda** tanpa if-else bersarang.
2. Kode lebih mudah dibaca — tidak ada conditional `isOdcDevice ? ... : null` yang bertumpuk.
3. Onboarding device type baru lebih mudah — cukup buat file form baru.
4. Risiko regression antar device type berkurang drastis.
5. `device-detail-form.tsx` (700+ baris) dan `device-create-form.tsx` bisa dipecah.
6. **[BARU]** Setiap device type memiliki field relasi topologi yang eksplisit — mendukung pembentukan relasi antar device fiber optik (ODC → Cable → ODP → ONT).

---

## 2. Current State

### Detail Form — `device-detail-form.tsx` (~730 baris)

```
DeviceDetailForm (export)
├── DeviceIdentitySection      — identity + type-specific labels (ODC/ODP/generic)
├── DeviceRelationSection      — region, POP, project, tenant, manufacturer, brand, model
├── DeviceTechnicalSection     — capacity core, port, splitter (+ DEVICE_TECHNICAL_COPY map)
├── DeviceLocationSection      — address, province, city, longitude, latitude
├── DeviceTagsSection          — tags CSV
├── SplitterRatioField         — combobox + auto-fill port count
├── ComboboxField              — wrapper
├── DisplayField               — read-only display
├── LinkedDisplayField         — link display
├── Field                      — input wrapper
├── CoordinateField            — lat/lng with validation
├── SelectField                — combobox select
├── valueOf()                  — utility
└── validateCoordinateFormat() — utility
```

**Masalah:** Semua device type (ODC, ODP, OLT, ONT, CABLE, SWITCH, ROUTER, OTB, JC, HH, MH) masuk dalam **satu file**. Perbedaan hanya lewat `isOdpDevice`, `isOdcDevice`, dan `DEVICE_TECHNICAL_COPY` lookup.

### Create Form — `create/page.tsx` + component fragments

```
create/page.tsx (orchestrator)
├── DeviceCreateForm          — nama device, ODP-type, POP, project, tenant
├── DeviceHardwareFields      — manufacturer, brand, model, serial
├── DeviceCapacityFields      — core, port, splitter (+ type-specific labels)
├── CreateLocationFields      — address, province, city, lat, lng
├── CreateOperationalFields   — status, installation date, validation
└── (other kind forms: POP, Route, Project, Customer)
```

**Masalah:** `DeviceCapacityFields` dan `DeviceCreateForm` juga pakai conditional `isOdp`, `isOdc` untuk label, tapi masih dalam satu komponen.

### Device Type Landscape

| Type | Detail Form Section | Create Form Section | Current Treatment |
|------|--------------------|--------------------|-------------------|
| **ODC** | Technical: core, port, splitter | Identity + Hardware + Capacity | `isOdcDevice` labels |
| **ODP** | Technical: core (disabled), port, splitter | Identity + ODP-type + Hardware + Capacity | `isOdpDevice` + `OdpOperationsPanel` |
| **OLT** | Technical: management_ip, core, port, splitter | Identity + Hardware + Capacity | Generic via `DEVICE_TECHNICAL_COPY` |
| **ONT** | Technical: management_ip, core, port, splitter | Identity + Hardware + Capacity | Generic + `showServicePortRelations` |
| **CABLE** | Technical: core, port (endpoint), splitter | Identity + Hardware + Capacity | Generic |
| **SWITCH** | Technical: management_ip, core, port, splitter | Identity + Hardware + Capacity | Generic |
| **ROUTER** | Technical: management_ip, core, port, splitter | Identity + Hardware + Capacity | Generic |
| **OTB** | Technical: core, port, splitter | Identity + Hardware + Capacity | Generic |
| **JC** | Technical: core, port, splitter | Identity + Hardware + Capacity | Generic (CORE_TYPES only) |
| **HH/MH** | — | Identity + Hardware | Generic (minimal fields) |

---

## 3. Target Architecture

### Detail Form — Per-Device-Type Structure

```
components/features/data-management/device-detail/
  ├── index.ts                           # barrel export
  ├── device-detail-form.tsx             # REMOVE or keep as backward-compat wrapper
  ├── forms/
  │   ├── generic-device-form.tsx        ✅ default untuk OLT, ONT, SWITCH, ROUTER, OTB, JC, HH, MH
  │   ├── odc-device-form.tsx            ✅ ODC-specific + shared sections
  │   ├── odp-device-form.tsx            ✅ ODP-specific + shared sections
  │   ├── cable-device-form.tsx          ✅ CABLE-specific (Phase B)
  │   └── otb-device-form.tsx            ✅ OTB-specific (Phase B)
  ├── sections/                          # SHARED — default info + low-level field helpers
  │   ├── default-info-section.tsx       ✅ identity, relation, location, tags, status
  │   ├── device-technical-helpers.tsx   ✅ shared field UI, DEVICE_TECHNICAL_COPY, format helpers
  │   └── index.ts                       ✅ barrel export
  └── [existing files tetap]             # DeviceHeader, PortSummary, Gallery, dll
```

### Create Form — Per-Device-Type Structure

```
components/features/data-management/device-form/
  ├── index.ts                           # barrel export
  ├── create/
  │   ├── generic-device-create.tsx      ✅ default
  │   ├── odc-device-create.tsx          ✅ ODC-specific
  │   ├── odp-device-create.tsx          ✅ ODP-specific
  │   └── cable-device-create.tsx        ✅ CABLE-specific
  ├── fields/                            # SHARED — sudah ada
  │   ├── device-create-form.tsx         # identity fields
  │   ├── device-hardware-fields.tsx
  │   ├── device-capacity-fields.tsx
  │   ├── create-location-fields.tsx
  │   ├── create-operational-fields.tsx
  │   └── form-field-grid.tsx
  └── [existing files tetap]
```

### Key Design Decision: 3 Sections per Device Form

Setiap device form (create & detail) terdiri dari **3 section utama**:

| Section | Isi | Shared? |
|---------|-----|---------|
| **1. Informasi Default** | Device identity, relation organisasi (POP/project/tenant), hardware (brand/model/serial/manufacturer), lokasi (address/province/city/coordinates), tags, status operasional | ✅ **Shared** — sama untuk semua device type |
| **2. Informasi Teknis** | Spesifikasi perangkat: capacity core, port count, splitter, management IP, dan field teknis lainnya yang spesifik per device type | ❌ **Berbeda** — setiap device type punya komponen sendiri |
| **3. Relasi Topologi** | Device terhubung ke device lain: upstream device, downstream device, kabel penghubung, route — field yang membentuk relasi jaringan fiber optik | ❌ **Berbeda** — setiap device type punya relasi berbeda |

```tsx
// Contoh: Bentuk akhir ODC detail form
<DeviceFormShell>
  {/* Section 1 — Informasi Default (shared) */}
  <DefaultInfoSection
    form={form} onChange={onChange} editing={editing}
    relationLabels={relationLabels}
    tenants={tenants} popOptions={popOptions} projectOptions={projectOptions}
  />

  {/* Section 2 — Informasi Teknis ODC */}
  <OdcTechnicalSection
    form={form} onChange={onChange} editing={editing}
    splitterProfiles={splitterProfiles}
  />

  {/* Section 3 — Relasi Topologi ODC */}
  <OdcTopologySection
    form={form} onChange={onChange} editing={editing}
    cableOptions={cableOptions}
    upstreamDeviceOptions={upstreamDeviceOptions}
  />
</DeviceFormShell>
```

**Konsekuensi arsitektur:**

1. `DefaultInfoSection` tidak boleh berisi field teknis atau field relasi topologi.
2. Section 2 (Teknis) berisi spesifikasi hardware/kapasitas device — tidak bergantung pada device lain.
3. Section 3 (Topologi) berisi relasi eksplisit ke device lain — membutuhkan lookup ke device/cable list.
4. Setiap device type punya komponen Section 2 dan Section 3 sendiri.
5. Mudah dikembangkan: device type baru → buat Section 2 + Section 3 + reuse Section 1.

---

## 4. Field Default — Semua Device Type (Section 1)

Field berikut **wajib ada dan identik** untuk semua device type. Tidak boleh ada field teknis atau relasi di sini.

### 4.1 Sub-section: Informasi Umum

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Device ID | `device_id` | string (readonly) | Auto-generated |
| Device Name | `device_name` | string (editable) | Normalized format |
| Device Type | `device_type_key` | string (readonly) | ODC, ODP, OLT, dll |
| Asset Group | `asset_group` | string (readonly) | Dari backend |
| Status | `status` | enum | draft, installed, active, inactive, maintenance, retired |
| Installation Date | `installation_date` | date | |
| Validation Status | *(dari effectiveValidationStatus)* | display only | |
| Validation Date | `validation_date` | date (readonly) | |

### 4.2 Sub-section: Relasi & Vendor

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Region | *(dari relationLabels.region)* | display only | Tidak bisa diedit langsung |
| POP | `pop_id` | combobox | Opsional |
| Project | `project_id` | combobox | Opsional |
| Tenant | `tenant_id` | combobox | Opsional |
| Manufacturer | *(dari relationLabels.manufacturer)* | display only | |
| Brand | *(dari relationLabels.brand)* | display only | |
| Model | *(dari relationLabels.model)* | display only | |
| Serial Number | `serial_number` | string | |

### 4.3 Sub-section: Lokasi

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Alamat | `address` | string | |
| Provinsi | `province_id` | combobox | Master data |
| Kota/Kabupaten | `city_id` | combobox | Filtered by province |
| Longitude | `longitude` | string | Format: 3 digit + min 6 desimal |
| Latitude | `latitude` | string | Format: wajib minus + min 6 desimal |

### 4.4 Sub-section: Tags

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Tags | `tags` | string (CSV) | Comma-separated |

---

## 5. Field Teknis Per Device Type (Section 2)

Field berikut berbeda per device type dan **tidak boleh dicampur** ke Section 1.

### 5.1 ODC (Optical Distribution Cabinet)

> Perangkat pasif fiber sebagai titik distribusi utama dari backbone ke ODP.

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Total Core Capacity | `capacity_core` | number | Total inti fiber di ODC |
| Used Core | `used_core` | number | Core yang sudah terpakai |
| Total Port Cabinet | `total_ports` | number | Jumlah port distribusi |
| Port Terpakai | `used_ports` | number | |
| Splitter Profile | `splitter_ratio` | combobox | Auto-fill port count |
| Feeder Port Count | `feeder_port_count` | number | Port untuk koneksi upstream ke backbone |
| Distribution Port Count | `distribution_port_count` | number | Port untuk koneksi downstream ke ODP |

### 5.2 ODP (Optical Distribution Point)

> Perangkat pasif fiber sebagai titik terminasi distribusi ke pelanggan.

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Tipe ODP | `odp_type` | combobox | Dari master data |
| Jenis Instalasi | `installation_type` | combobox | Dari master data |
| Nama ODP Baru | *(dari latestFieldValidation)* | display only | Dari validasi lapangan |
| Kapasitas Core | `capacity_core` | display only | Auto dari core chain, tidak bisa diedit |
| Kapasitas ODP | `total_ports` | combobox/number | Preset jika splitter >= 1:16 |
| Port Aktif | `used_ports` | number | |
| Kapasitas Splitter | `splitter_ratio` | combobox | |

### 5.3 OLT (Optical Line Terminal)

> Perangkat aktif di sisi operator, menjadi head-end jaringan GPON/EPON.

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Management IP | `management_ip` | string | IP address manajemen |
| Capacity Core | `capacity_core` | number | |
| Used Core | `used_core` | number | |
| PON Port Count | `pon_port_count` | number | Jumlah port PON untuk ONT |
| Uplink Port Count | `uplink_port_count` | number | Port uplink ke router/backbone |
| Total Port | `total_ports` | number | Total semua port |
| Used Port | `used_ports` | number | |
| Splitter Ratio | `splitter_ratio` | combobox | |

### 5.4 ONT (Optical Network Terminal)

> Perangkat aktif di sisi pelanggan, menerima sinyal dari OLT via ODP.

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Management IP | `management_ip` | string | |
| Serial Number GPON | `serial_number` | string | Serial untuk registrasi ke OLT |
| Total Service Port | `total_ports` | number | Port layanan (LAN, POTS, CATV) |
| Used Service Port | `used_ports` | number | |
| Splitter Ratio | `splitter_ratio` | combobox | |

### 5.5 CABLE (Kabel Fiber Optik)

> Media transmisi fisik yang menghubungkan antar device pasif.

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Tipe Kabel | `cable_type` | enum | single-mode, multi-mode, ADSS, OPGW, direct-buried |
| Kapasitas Core | `capacity_core` | number | Total inti fiber dalam kabel |
| Endpoint Ports | `total_ports` | number | Jumlah titik terminasi |
| Used Endpoint | `used_ports` | number | |
| Panjang Kabel (m) | `cable_length_m` | number | Panjang dalam meter |
| Splitter Ratio | `splitter_ratio` | combobox | Jika ada splitter inline |

### 5.6 SWITCH

> Perangkat aktif jaringan layer 2/3 untuk distribusi traffic IP.

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Management IP | `management_ip` | string | |
| Capacity Core | `capacity_core` | number | |
| Used Core | `used_core` | number | |
| Interface Count | `total_ports` | number | Total port/interface |
| Used Interface | `used_ports` | number | |
| Splitter Ratio | `splitter_ratio` | combobox | |

### 5.7 ROUTER

> Perangkat aktif layer 3 untuk routing antar jaringan.

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Management IP | `management_ip` | string | |
| Capacity Core | `capacity_core` | number | |
| Used Core | `used_core` | number | |
| Interface Count | `total_ports` | number | |
| Used Interface | `used_ports` | number | |
| Splitter Ratio | `splitter_ratio` | combobox | |

### 5.8 OTB (Optical Terminal Box)

> Kotak terminasi fiber sebagai junction point.

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Capacity Core | `capacity_core` | number | |
| Used Core | `used_core` | number | |
| Total Port | `total_ports` | number | |
| Used Port | `used_ports` | number | |
| Splitter Ratio | `splitter_ratio` | combobox | |

### 5.9 JC (Joint Closure)

> Sambungan kabel fiber, digunakan untuk menyambung kabel di lapangan.

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Capacity Core | `capacity_core` | number | |
| Used Core | `used_core` | number | |
| Total Port | `total_ports` | number | |
| Used Port | `used_ports` | number | |

### 5.10 HH / MH (Handhole / Manhole)

> Ruang akses bawah tanah, tidak memiliki field teknis kapasitas fiber.

> Hanya memiliki Section 1 (Informasi Default). Section 2 kosong atau minimal.

---

## 6. Field Relasi Topologi Per Device Type (Section 3)

> **Tujuan:** Mendefinisikan koneksi fisik antar device. Field ini membentuk graf jaringan fiber optik dari backbone hingga ke pelanggan. Bukan field hardware/kapasitas, melainkan pointer ke device/kabel/rute lain.

### Topologi Fiber Optik yang Ingin Direpresentasikan

Empat alur relasi device utama yang harus didukung oleh sistem:

---

#### Alur 1 — FTTH (Fiber to The Home) — Jaringan Akses

Alur standar dari OLT di POP sampai ke pelanggan via infrastruktur pasif fiber optik.

```text
[OLT]                          # Perangkat aktif di POP — head-end GPON/EPON
  │
  └── [OTB / ODF]              # Optical Termination Box — terminasi kabel feeder di POP
        │
        └── [Fiber Feeder]     # Kabel feeder (CABLE type) — dari POP ke ODC
              │
              └── [ODC]        # Optical Distribution Cabinet — titik distribusi di lapangan
                    │
                    ├── [Splitter] (opsional)    # Splitter optik 1:N di dalam ODC
                    │       │
                    │       └── [Fiber Distribusi]  # Kabel distribusi (CABLE type)
                    │              │
                    │              └── [ODP]        # Optical Distribution Point — titik dekat pelanggan
                    │                    │
                    │                    ├── [Splitter] (opsional)  # Splitter di ODP
                    │                    │       │
                    │                    │       └── [Drop Cable]   # Kabel drop (CABLE type)
                    │                    │              │
                    │                    │              └── [ONT/ONU]     # Optical Network Terminal — di pelanggan
                    │                    │                    │
                    │                    │                    └── [Customer]  # Pelanggan akhir
                    │                    │
                    │                    └── (langsung ke ONT jika tanpa splitter)
                    │
                    └── [Fiber Distribusi] → [ODP] → ... (ke ODP lain)
```

**Relasi perangkat (upstream → downstream):**

| Device | Upstream | Downstream | Media Koneksi |
|--------|----------|------------|---------------|
| OLT | Router/Switch | OTB | Patch cord fiber |
| OTB | OLT | Fiber Feeder (CABLE) | Pigtail / patch panel |
| Fiber Feeder (CABLE) | OTB port | ODC port | Kabel feeder |
| ODC | Fiber Feeder | Fiber Distribusi (CABLE) | Port ODC + splitter |
| Fiber Distribusi (CABLE) | ODC port | ODP port | Kabel distribusi |
| ODP | Fiber Distribusi | Drop Cable (CABLE) | Port ODP + splitter |
| Drop Cable (CABLE) | ODP port | ONT port | Kabel drop |
| ONT | Drop Cable | Customer | Kabel UTP / koaksial |

---

#### Alur 2 — IP Network (Active Devices)

Alur dari core network sampai ke akses pelanggan via perangkat aktif.

```text
[Core Router]                  # Router backbone utama — koneksi antar POP / ke internet
  │
  └── [Distribution Switch]    # Switch distribusi — agregasi beberapa Access Switch
        │
        └── [Access Switch]    # Switch akses — koneksi ke OLT dan perangkat POP lain
              │
              └── [OLT]        # Optical Line Terminal — konversi listrik → optik
                    │
                    └── [OTB / ODF]   # Terminasi fiber — masuk ke jaringan pasif
                          │
                          └── [ODC]   # Distribusi fiber di lapangan
                                │
                                └── [ODP]   # Titik terminasi dekat pelanggan
                                      │
                                      └── [ONT/ONU]   # Perangkat pelanggan
```

**Relasi perangkat (upstream → downstream):**

| Device | Upstream | Downstream | Media Koneksi |
|--------|----------|------------|---------------|
| Core Router | Backbone IP | Distribution Switch | Fiber / kabel tembaga |
| Distribution Switch | Core Router | Access Switch | Fiber / kabel tembaga |
| Access Switch | Distribution Switch | OLT | Fiber / SFP |
| OLT | Access Switch | OTB | Patch cord fiber |
| OTB | OLT | ODC | Fiber Feeder (CABLE) |
| ODC | OTB | ODP | Fiber Distribusi (CABLE) |
| ODP | ODC | ONT | Drop Cable (CABLE) |

---

#### Alur 3 — Backbone Fiber Optik (Layer 1)

Alur backbone antar POP via kabel fiber jarak jauh dengan Joint Closure di tengah.

```text
[POP A]                        # Point of Presence — sisi A
  │
  └── [OTB / ODF A]           # Terminasi fiber di POP A
        │
        └── [Backbone Cable]  # Kabel backbone jarak jauh (CABLE type) — bisa 10-100km
              │
              ├── [Joint Closure]   # Sambungan kabel di tengah rute
              │       │
              │       └── [Joint Closure]   # Bisa lebih dari 1 JC
              │              │
              │              └── [Backbone Cable]   # Segmen kabel berikutnya
              │                     │
              │                     └── [OTB / ODF B]   # Terminasi fiber di POP B
              │                           │
              │                           └── [POP B]   # Point of Presence — sisi B
              │
              └── (bisa juga langsung tanpa JC jika satu tarikan)
                    │
                    └── [OTB / ODF B] → [POP B]
```

**Relasi perangkat (upstream → downstream):**

| Device | Upstream | Downstream | Media Koneksi |
|--------|----------|------------|---------------|
| OTB/ODF A | Perangkat POP A | Backbone Cable | Pigtail / patch panel |
| Backbone Cable | OTB/ODF A | JC atau OTB/ODF B | Kabel backbone |
| Joint Closure | Backbone Cable (segm.1) | Backbone Cable (segm.2) | Splice tray |
| Joint Closure (n) | Backbone Cable (segm.n) | Backbone Cable (segm.n+1) | Splice tray |
| OTB/ODF B | Backbone Cable | Perangkat POP B | Pigtail / patch panel |

---

#### Alur 4 — Backbone IP (Layer 2/3)

Alur backbone IP dari Core Router sampai ke OLT via hierarki switch.

```text
[Core Router]                  # Router core — edge ke internet / peering
  │
  └── [Aggregation Switch]    # Switch agregasi — kumpulkan traffic dari多个 area
        │
        └── [Access Switch]    # Switch akses — koneksi langsung ke OLT
              │
              └── [OLT]        # Optical Line Terminal — masuk ke jaringan akses fiber
```

**Relasi perangkat (upstream → downstream):**

| Device | Upstream | Downstream | Media Koneksi |
|--------|----------|------------|---------------|
| Core Router | — | Aggregation Switch | Fiber optic / SFP+ |
| Aggregation Switch | Core Router | Access Switch | Fiber optic / SFP+ |
| Access Switch | Aggregation Switch | OLT | Fiber optic / SFP |
| OLT | Access Switch | OTB / ODF | Patch cord |

---

#### Ringkasan Semua Alur

```text
                    ┌──────────────────────────────────────────────────┐
                    │              BACKBONE IP (Layer 3)               │
                    │  Core Router → Aggregation Switch → Access Sw.   │
                    └──────────────────────┬───────────────────────────┘
                                           │
                    ┌──────────────────────▼───────────────────────────┐
                    │              BACKBONE FIBER (Layer 1)            │
                    │  POP A → OTB → Backbone Cable → JC → OTB → POP B│
                    └──────────────────────┬───────────────────────────┘
                                           │
                    ┌──────────────────────▼───────────────────────────┐
                    │         JARINGAN AKSES FTTH (Layer 1/2)          │
                    │  OLT → OTB → Feeder → ODC → Distribusi → ODP    │
                    │                                   │              │
                    │                              Drop Cable          │
                    │                                   │              │
                    │                               ONT/ONU            │
                    │                                   │              │
                    │                              Customer            │
                    └──────────────────────────────────────────────────┘
```

**Konsekuensi arsitektur untuk form:**

1. Setiap device type perlu tahu upstream dan downstream device typenya untuk filter lookup.
2. CABLE type perlu dibedakan perannya: `feeder`, `distribution`, `drop`, `backbone`.
3. JC (Joint Closure) perlu device type sendiri dengan relasi from/to cable.
4. OTB di POP punya relasi ke backbone cable (sisi backbone) dan ke feeder cable (sisi akses).
5. Sequence lookup tidak boleh hardcoded — gunakan device_type_key filtering.

### 6.1 ODC — Relasi Topologi

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Upstream Device | `upstream_device_id` | combobox (device) | ODC atau backbone node di atasnya |
| Upstream Cable | `upstream_cable_id` | combobox (cable device) | Kabel yang membawa sinyal dari upstream ke ODC ini |
| Upstream Core Range | `upstream_core_start` / `upstream_core_end` | number | Range core yang dipakai di upstream cable |
| Downstream ODP List | *(read-only dari topology summary)* | display | ODP-ODP yang terhubung ke ODC ini |

### 6.2 ODP — Relasi Topologi

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Source ODC | `source_odc_id` | combobox (device ODC) | ODC yang menjadi sumber distribusi ke ODP ini |
| ODC Port | `source_odc_port_id` | combobox (port) | Port ODC yang terhubung ke ODP ini |
| Feeder Cable | `feeder_cable_id` | combobox (cable device) | Kabel dari ODC ke ODP |
| Feeder Core Range | `feeder_core_start` / `feeder_core_end` | number | Core yang digunakan di feeder cable |
| Downstream ONT List | *(read-only dari topology summary)* | display | ONT-ONT yang assigned ke ODP ini |

### 6.3 OLT — Relasi Topologi

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Connected Switch | `uplink_switch_id` | combobox (device SWITCH) | Switch yang menjadi uplink OLT |
| Connected Router | `uplink_router_id` | combobox (device ROUTER) | Router upstream jika tidak via switch |
| Downstream ODC List | *(read-only)* | display | ODC yang terhubung ke OLT ini |

### 6.4 ONT — Relasi Topologi

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Source ODP | `source_odp_id` | combobox (device ODP) | ODP yang menjadi distribusi ke ONT ini |
| ODP Port | `source_odp_port_id` | combobox (port) | Port ODP yang dipakai ONT ini |
| Source OLT | `source_olt_id` | combobox (device OLT) | OLT yang melayani ONT ini |
| Customer | `customer_id` | combobox (customer) | Pelanggan yang menggunakan ONT ini |

### 6.5 CABLE — Relasi Topologi

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| From Device | `from_device_id` | combobox (device) | Device asal — ODC, OTB, JC, POP |
| From Port | `from_port_id` | combobox (port) | Port di device asal |
| To Device | `to_device_id` | combobox (device) | Device tujuan — ODC, ODP, OTB, JC |
| To Port | `to_port_id` | combobox (port) | Port di device tujuan |
| Route | `route_id` | combobox (route) | Rute jalur kabel |

### 6.6 SWITCH / ROUTER — Relasi Topologi

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| Uplink Device | `uplink_device_id` | combobox | Router atau switch upstream |
| Downstream OLT List | *(read-only)* | display | OLT yang terhubung ke switch/router ini |

### 6.7 OTB — Relasi Topologi

OTB memiliki dua peran tergantung posisinya:

| Peran | Posisi | Upstream | Downstream |
|-------|--------|----------|------------|
| **OTB Akses** | Di POP sisi akses | OLT | Fiber Feeder (ke ODC) |
| **OTB Backbone** | Di POP sisi backbone | Backbone Cable (dari POP lain) | Perangkat POP lokal |

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| From Cable (Upstream) | `from_cable_id` | combobox (cable device) | Kabel masuk — feeder atau backbone cable |
| To Cable (Downstream) | `to_cable_id` | combobox (cable device) | Kabel keluar — distribusi atau backbone cable |
| From Device | `from_device_id` | combobox (device) | Device upstream — OLT, POP, atau OTB lain |
| To Device | `to_device_id` | combobox (device) | Device downstream — ODC atau OTB lain |
| Koneksi Backbone | `is_backbone_connection` | boolean | True jika ini koneksi antar POP via backbone |

### 6.8 JC (Joint Closure) — Relasi Topologi

JC adalah titik sambung kabel di tengah rute backbone atau distribusi. Tidak memiliki perangkat aktif — hanya sebagai splice point.

| Field | Key | Type | Notes |
|-------|-----|------|-------|
| From Cable (Segmen A) | `from_cable_id` | combobox (cable device) | Kabel masuk — segmen backbone sebelumnya |
| To Cable (Segmen B) | `to_cable_id` | combobox (cable device) | Kabel keluar — segmen backbone berikutnya |
| Route | `route_id` | combobox (route) | Route backbone yang dilalui |
| Core Range A → B | `core_start` / `core_end` | number | Range core yang disambung di JC ini |
| Splice Tray Count | `splice_tray_count` | number | Jumlah tray splice di JC |

```text
Contoh: Backbone dengan 2 JC

POP A OTB → Backbone Cable (seg.1) → JC-01 → Backbone Cable (seg.2) → JC-02 → Backbone Cable (seg.3) → POP B OTB

JC-01:
  from_cable_id = Backbone Cable seg.1
  to_cable_id   = Backbone Cable seg.2
  core_start    = 1
  core_end      = 48

JC-02:
  from_cable_id = Backbone Cable seg.2
  to_cable_id   = Backbone Cable seg.3
  core_start    = 1
  core_end      = 48
```

### 6.9 HH / MH — Relasi Topologi

> HH/MH hanya sebagai waypoint fisik. Relasi direpresentasikan lewat Route, bukan device-to-device link.

---

## 7. Typed EditableForm

> **Masalah saat ini:** `EditableForm = Record<string, string>` terlalu generik — tidak ada kontrak eksplisit field per device type.

### 7.1 Base Form (shared semua device)

```ts
type DeviceBaseForm = {
  // Identity
  device_id: string;
  device_name: string;
  device_type_key: string;
  asset_group: string;
  // Status
  status: string;
  installation_date: string;
  validation_date: string;
  // Relation
  pop_id: string;
  region_id: string;
  project_id: string;
  tenant_id: string;
  manufacturer_id: string;
  brand_id: string;
  model_id: string;
  serial_number: string;
  // Lokasi
  address: string;
  province_id: string;
  city_id: string;
  longitude: string;
  latitude: string;
  // Tags
  tags: string;
};
```

### 7.2 Extended Forms Per Type

```ts
type OdcEditableForm = DeviceBaseForm & {
  // Technical
  capacity_core: string;
  used_core: string;
  total_ports: string;
  used_ports: string;
  splitter_ratio: string;
  feeder_port_count: string;
  distribution_port_count: string;
  // Topology
  upstream_device_id: string;
  upstream_cable_id: string;
  upstream_core_start: string;
  upstream_core_end: string;
};

type OdpEditableForm = DeviceBaseForm & {
  // Technical
  odp_type: string;
  installation_type: string;
  capacity_core: string; // readonly — dari core chain
  total_ports: string;
  used_ports: string;
  splitter_ratio: string;
  // Topology
  source_odc_id: string;
  source_odc_port_id: string;
  feeder_cable_id: string;
  feeder_core_start: string;
  feeder_core_end: string;
};

type CableEditableForm = DeviceBaseForm & {
  // Technical
  cable_type: string;
  capacity_core: string;
  total_ports: string;
  used_ports: string;
  cable_length_m: string;
  // Topology
  from_device_id: string;
  from_port_id: string;
  to_device_id: string;
  to_port_id: string;
  route_id: string;
};

type OltEditableForm = DeviceBaseForm & {
  // Technical
  management_ip: string;
  capacity_core: string;
  used_core: string;
  pon_port_count: string;
  uplink_port_count: string;
  total_ports: string;
  used_ports: string;
  // Topology
  uplink_switch_id: string;
  uplink_router_id: string;
};

type OntEditableForm = DeviceBaseForm & {
  // Technical
  management_ip: string;
  total_ports: string;
  used_ports: string;
  // Topology
  source_odp_id: string;
  source_odp_port_id: string;
  source_olt_id: string;
  customer_id: string;
};

// GenericEditableForm — untuk SWITCH, ROUTER, OTB, JC, HH, MH
type GenericEditableForm = DeviceBaseForm & {
  management_ip: string;
  capacity_core: string;
  used_core: string;
  total_ports: string;
  used_ports: string;
  splitter_ratio: string;
  cable_type: string;
  cable_length_m: string;
  uplink_device_id: string;
  from_cable_id: string;
  to_cable_id: string;
};
```

> **Catatan implementasi:** Pada tahap awal, `EditableForm = Record<string, string>` masih dipertahankan untuk tidak break existing code. Typed forms diperkenalkan bertahap per Phase F.

---

## 8. Shared Props Interface

Semua form detail menerima props yang sama untuk Section 1:

```tsx
type DeviceFormProps = {
  form: EditableForm;
  onChange: (next: EditableForm | ((prev: EditableForm) => EditableForm)) => void;
  editing: boolean;
  relationLabels: RelationLabels;
  relationLoading?: boolean;
  splitterProfiles: SplitterProfileOption[];
  tenants: TenantOption[];
  popOptions: PopLookupOption[];
  projectOptions: ProjectLookupOption[];
  projectHref?: string;
  effectiveValidationStatus: string;
  provinces?: ProvinceOption[];
  cities?: CityOption[];
};
```

Props tambahan untuk Section 3 (Relasi Topologi) dilewatkan khusus per device type:

```tsx
// Contoh untuk OdcDeviceForm
type OdcDeviceFormProps = DeviceFormProps & {
  // Section 2
  splitterProfiles: SplitterProfileOption[];
  // Section 3
  cableDeviceOptions: DeviceOption[];        // untuk upstream_cable_id
  upstreamDeviceOptions: DeviceOption[];    // untuk upstream_device_id
};

// Contoh untuk OdpDeviceForm
type OdpDeviceFormProps = DeviceFormProps & {
  // Section 2
  odpTypes: OdpTypeOption[];
  installationTypes: InstallationTypeOption[];
  latestFieldValidation?: OdpFieldValidationPayload | null;
  // Section 3
  odcOptions: DeviceOption[];               // untuk source_odc_id
  odcPortOptions: PortOption[];             // untuk source_odc_port_id
  cableDeviceOptions: DeviceOption[];       // untuk feeder_cable_id
};
```

**Yang tidak perlu di-prop (tetap di page level):**
- `isOdpDevice` — dihapus, diganti dengan pemilihan form type
- Semua props topology lookup di-pass langsung ke form yang membutuhkan

---

## 9. Phase Plan

### Phase A — Ekstrak Shared Default Section ke File Terpisah ✅

> **Goal:** Memindahkan field default dari `device-detail-form.tsx` ke `DefaultInfoSection`, tanpa membawa field teknis atau field khusus device type ke shared default.

**Todo:**
- [x] Buat `sections/default-info-section.tsx` — identity, relation, location, tags, status.
- [x] Buat `sections/device-technical-helpers.tsx` — shared field UI, `DEVICE_TECHNICAL_COPY`, `SplitterRatioField`, `valueOf`, `validateCoordinateFormat`.
- [x] Buat `sections/index.ts` — barrel export.
- [x] Update import di `device-detail-form.tsx` — wrapper memakai `DefaultInfoSection`.
- [x] Pindahkan field ODP-specific (`odp_type`, `installation_type`, latest ODP suggested name) keluar dari `DefaultInfoSection` ke section teknis.

**Risiko:** Rendah. ✅ TypeScript lulus.

**Checker:**
- [x] Scoped eslint untuk file detail form dan sections.
- [ ] `npm run build`
- [ ] Detail device type apa pun tetap tampil sama

---

### Phase B — Buat Per-Device-Type Form Files ✅

> **Goal:** Membuat `generic-device-form.tsx`, `odc-device-form.tsx`, `odp-device-form.tsx` di folder `forms/`.

**Todo:**
- [x] Buat `forms/generic-device-form.tsx`
  - DefaultInfoSection + GenericTechnical (management_ip conditional, core, port, splitter)
- [x] Buat `forms/odc-device-form.tsx`
  - DefaultInfoSection + OdcTechnical (core, port, splitter — tanpa management_ip)
- [x] Buat `forms/odp-device-form.tsx`
  - DefaultInfoSection + OdpTechnical (`odp_type`, `installation_type`, latest ODP name, core disabled, port preset, splitter)
- [x] Buat `forms/index.ts` — barrel export
- [x] Buat `forms/cable-device-form.tsx` — CABLE-specific: cable_type, capacity_core, used_core, endpoint ports, cable_length_m, splitter
- [x] Buat `forms/otb-device-form.tsx` — OTB-specific: capacity_core, used_core, total/used port, connector_type, tray_slot_count, splitter

**Risiko:** Sedang. ✅ TypeScript lulus tanpa error.

**Checker:**
- [x] TypeScript (`npx tsc --noEmit`) ✅
- [x] Tidak ada `isOdpDevice`/`isOdcDevice` di form components ✅
- [x] Semua form share `DefaultInfoSection` yang sama ✅
- [ ] ODC detail — field "Total Port Cabinet", "Splitter Profile", Capacity Core, Used Core *(manual UAT)*
- [ ] ODP detail — field "Kapasitas ODP", "Port Aktif", "Kapasitas Splitter", core disabled *(manual UAT)*
- [ ] OLT detail — field Management IP, Capacity Core, Total PON/Uplink Ports *(manual UAT)*
- [ ] ONT detail — field Management IP, Total Service Ports *(manual UAT)*
- [ ] CABLE detail — field Capacity Core, Endpoint Ports *(manual UAT)*
- [x] `npm run lint` — 0 error ✅
- [x] `npm run build` — sukses ✅

---

### Phase C — Update Page Orchestrator ✅

> **Goal:** Mengubah `list/[slug]/[id]/page.tsx` untuk memilih form berdasarkan `device_type_key`.

**Todo:**
- [x] Buat `DeviceFormSelection` component — selector ODP/ODC/Generic
- [x] Integrasikan `DeviceFormSelection` di `list/[slug]/[id]/page.tsx` (baris 1932)
- [x] Hapus dead import `DeviceDetailForm` dari page (sudah tidak dirender)
- [x] Hapus dead import `GenericDeviceForm`, `OdcDeviceForm`, `OdpDeviceForm` dari page (sudah di-handle `DeviceFormSelection`)
- [x] Verifikasi ODP operations panel tetap muncul hanya untuk ODP ✅

**Risiko:** Rendah. Sudah terimplementasi.

**Checker:**
- [x] `DeviceFormSelection` digunakan di render ✅
- [ ] Semua device type detail tetap tampil tanpa error *(manual UAT)*
- [ ] ODP operations panel tetap muncul hanya untuk ODP *(manual UAT)*
- [x] `npm run lint` — 0 error ✅
- [x] `npm run build` — sukses ✅

---

### Phase D — Create Form Per-Device-Type ✅

> **Goal:** Memecah `DeviceCreateForm` dan `DeviceCapacityFields` menjadi per-type.

**Done:**
- [x] Buat `create/generic-device-create.tsx` — wrapping shared fields
- [x] Buat `create/odc-device-create.tsx` — dengan ODC-specific capacity labels + feeder/distribution port fields
- [x] Buat `create/odp-device-create.tsx` — dengan ODP-type + installation fields
- [x] Buat `create/cable-device-create.tsx` — dengan cable_type + cable_length_m
- [x] Buat `create/index.ts` — barrel export
- [x] Buat `create-form-selection.tsx` — selector ODC/ODP/CABLE/Generic
- [x] Update `create/page.tsx` — form state + submit payload diperkaya (management_ip, feeder_port_count, dll.), 3 render blocks diganti single `<CreateFormSelection>`
- [x] TypeCheck ✅ (0 error)
- [x] Build ✅ (berhasil)

**Risiko:** Sedang-Rendah. ✅ TypeScript lulus, build sukses.

---

### Phase E — Bersihkan Legacy Code ✅

> **Goal:** Hapus kode yang sudah tidak dipakai setelah refactor.

**Done:**
- [x] Hapus `device-detail-form.tsx` — entire file dead (legacy form containing `isOdpDevice` conditionals), replaced by `DeviceFormSelection`
- [x] Hapus export `DeviceDetailForm` dari `device-detail/index.ts`
- [x] Hapus dead variables `needsPortPresetSelector` + `splitterPortPresetOptions` dari `create/page.tsx`
- [x] `isOdpDevice` di detail `page.tsx` dipertahankan — masih dipakai untuk ODP-specific detail view (Informasi ODP card, port summary, data fetching)

**Risiko:** Rendah. ✅ TypeScript lulus tanpa error.

---

### Phase F — Tambah Section Relasi Topologi (Section 3) ✅ ✅

> **Goal:** Menambahkan Section 3 (Relasi Topologi) ke setiap device form, memungkinkan operator mendefinisikan koneksi antar device dari UI.

**Done (Detail Form — Section 3):**
- [x] Buat `sections/device-topology-helpers.tsx` — shared types, helper UI (TopologyCard), converter functions (toDeviceOptions, toPortOptions, toRouteOptions, toCustomerOptions)
- [x] Buat `forms/sections/odc-topology-section.tsx` — upstream_device_id, upstream_cable_id, core range
- [x] Buat `forms/sections/odp-topology-section.tsx` — source_odc_id, source_odc_port_id, feeder_cable_id, core range, customer
- [x] Buat `forms/sections/cable-topology-section.tsx` — from_device_id, from_port_id, to_device_id, to_port_id, route_id
- [x] Buat `forms/sections/olt-topology-section.tsx` — uplink_switch_id, uplink_router_id
- [x] Buat `forms/sections/ont-topology-section.tsx` — source_odp_id, source_odp_port_id, source_olt_id
- [x] Buat `forms/sections/generic-topology-section.tsx` — uplink_device_id, from_cable_id, to_cable_id
- [x] Buat `forms/sections/otb-topology-section.tsx` — from_cable_id, to_cable_id, from_device_id, to_device_id, is_backbone_connection
- [x] Buat `forms/sections/jc-topology-section.tsx` — from_cable_id, to_cable_id, core_start, core_end, splice_tray_count
- [x] Buat `forms/sections/index.ts` — barrel export (8 topology sections)
- [x] Integrasikan topology sections ke masing-masing device form (ODC, ODP, CABLE, OTB, generic)
- [x] Update `DeviceFormSelection` — tambah `topologyLookup` prop, pass `emptyTopologyLookup()` default

**Status:** ✅ **Phase F selesai.** Detail form untuk semua device type sudah memiliki Section 3 (Relasi Topologi). Lookup data masih menggunakan placeholder (`emptyTopologyLookup()`) — akan diisi setelah backend endpoints siap.

**Out of scope (moved to roadmap):**
- Create Form Section 3 (topology fields di create form) — akan dikerjakan di phase terpisah setelah detail form topology stabil
- Data fetching for lookup (device/port/route per type) — tergantung kesiapan backend endpoints

**Risiko:** ✅ TypeScript lulus, 0 ESLint error. Topology sections aman di-render.

---

### Phase G — Typed EditableForm ✅

> **Goal:** Migrasi dari `Record<string, string>` ke typed form interface per device type.

**Done:**
- [x] Definisikan `DeviceBaseForm` type di `sections/device-technical-helpers.tsx` — 17 shared fields (device_id, device_name, status, pop_id, dll.)
- [x] Definisikan `EditableForm = Record<string, string>` (dipertahankan untuk backward compat dengan POP/customer/resource lain)
- [x] Definisikan `DeviceForm = DeviceBaseForm & Record<string, string>` — typed form khusus device, memberikan type safety untuk base fields + index signature untuk extra fields per device type
- [x] Definisikan 8 extended types: `OdcEditableForm`, `OdpEditableForm`, `CableEditableForm`, `OltEditableForm`, `OntEditableForm`, `OtbEditableForm`, `JcEditableForm`, `GenericEditableForm`
- [x] Export semua tipe baru dari `sections/index.ts`
- [x] `DefaultInfoSectionProps.form: DeviceForm` — type-safe base fields
- [x] `DefaultInfoSectionProps.onChange: EditableForm` — generic, kompatibel dengan topology sections
- [x] `DeviceFormSelection` bridging: internal cast `form = props.form as DeviceForm`, onChange tetap `EditableForm`
- [x] Form components (generic, odc, odp, cable, otb) — tidak perlu perubahan, akses extra fields via index signature `DeviceForm`
- [x] TypeScript 0 error, ESLint 0 error

**Risiko:** Rendah. ✅ TypeScript lulus, ESLint bersih. Tidak ada perubahan di page orchestrator.

---

### Phase H — Route Adjust: Pindahkan Route ke Bawaan CABLE

> **Goal:** Route bukan resource standalone — melainkan data yang melekat pada CABLE (panjang kabel / link segment / route dari kabel). Fase ini menyesuaikan UI dan config agar Route tidak muncul sebagai entitas terpisah.

**Latar belakang:**

Route saat ini masih muncul sebagai:
1. Menu item standalone di `AddDataMenu` (`?kind=route`)
2. Kategori asset terpisah di `data-management-config.ts` (`resource: "routes"`)
3. Metric terpisah di Region Card (`routeDistanceMeters` terpisah dari `cableDevices`)

Setelah klarifikasi domain, Route adalah data bawaan CABLE — panjang fisik kabel, segment/link yang dilalui kabel. Maka Route perlu diintegrasikan ke dalam CABLE, bukan sebagai resource mandiri.

**Todo:**
- [x] `add-data-menu.tsx` — Hapus menu item Route standalone. Route creation dipindahkan ke dalam form CABLE. ✅ (2026-06-26)
- [x] `data-management-config.ts` — Hapus entry route dari `DATA_CATEGORIES`; hapus "route" dari `RESERVED_ASSET_SLUGS`. ✅ (2026-06-26)
- [x] `region-card-grid.tsx` — Gabungkan metric Route ke dalam metric CABLE: `Cable {cableDevices} ({formatKilometers(routeDistanceMeters)})`. ✅ (2026-06-26)
- [x] `create/page.tsx` — Hapus handling `kind=route`; route fields ditambahkan ke CableCreateForm ✅ (2026-06-26)
- [x] `route-create-form.tsx` — Pindahkan/merge ke `cable-device-create.tsx` sebagai bagian dari form CABLE ✅ (2026-06-26)
- [x] `RouteDetailForm` — Hapus dari detail page.tsx (render block + function + relation labels + conditional) ✅ (2026-06-26)
- [x] Backend — Migration + registry update agar route_name/route_type tersimpan di devices table ✅ (2026-06-26)

**Risiko:** Sedang. Melibatkan perubahan di UI menu, config, region cards, create form, dan detail form. Tapi tidak mengubah arsitektur form yang sudah dibangun di Phase A–G.

**Catatan:** Detail page untuk route (list/detail route) bisa tetap dipertahankan sebagai display-only selama transisi, sebelum data route sepenuhnya dimigrasi ke CABLE.

---

**Arsitektur:**
```
Page level:       form: EditableForm (= Record<string, string>)
                            │
DeviceFormSelection:        │ form: EditableForm (props API)
                            │ form = form as DeviceForm (internal cast)
                            │ onChange: EditableForm (passed through)
                            ▼
Form components:  form: DeviceForm (= DeviceBaseForm & Record<string, string>)
                  onChange: EditableForm (= Record<string, string>)
                            │              │
              ┌─────────────┘              │
              ▼                             ▼
  DefaultInfoSection             Topology Sections
  (typed base fields)            (generic Record<string, string>)
```

---

## 10. File Change Summary

### New Files

```
components/features/data-management/device-detail/
  sections/
    default-info-section.tsx            ✅ [Phase A]
    device-technical-helpers.tsx        ✅ [Phase A]
    device-topology-helpers.tsx         ✅ [Phase F]
    index.ts                            ✅ [Phase A]
  forms/
    generic-device-form.tsx             ✅ [Phase B]
    odc-device-form.tsx                 ✅ [Phase B]
    odp-device-form.tsx                 ✅ [Phase B]
    index.ts                            ✅ [Phase B]
    cable-device-form.tsx               ✅ [Phase B — CABLE form]
    otb-device-form.tsx                 ✅ [Phase B — OTB form]
    sections/
      odc-topology-section.tsx          ✅ [Phase F]
      odp-topology-section.tsx          ✅ [Phase F]
      cable-topology-section.tsx        ✅ [Phase F]
      olt-topology-section.tsx          ✅ [Phase F]
      ont-topology-section.tsx          ✅ [Phase F]
      generic-topology-section.tsx      ✅ [Phase F]
      otb-topology-section.tsx          ✅ [Phase F]
      jc-topology-section.tsx           ✅ [Phase F]
      index.ts                          ✅ [Phase F]

components/features/data-management/device-form/
  create/
    generic-device-create.tsx           ✅ [Phase D]
    odc-device-create.tsx               ✅ [Phase D]
    odp-device-create.tsx               ✅ [Phase D]
    cable-device-create.tsx             ✅ [Phase D]
    index.ts                            ✅ [Phase D]
```

### Modified Files

```
components/features/data-management/device-detail/
  index.ts                              ✅ added exports [Phase B], removed DeviceDetailForm export [Phase E]
  device-form-selection.tsx             ✅ selector ODP/ODC/Generic [Phase C]; tambah topologyLookup prop [Phase F]

components/features/data-management/device-form/
  device-create-form.tsx                🟡 partial [Phase D — masih perlu simplify lebih lanjut jika ada duplikasi]
  device-capacity-fields.tsx            🟡 partial [Phase D — masih dipakai oleh create form sub-components]

app/(app)/data-management/list/[slug]/[id]/page.tsx   ✅ uses DeviceFormSelection [Phase C]
app/(app)/data-management/create/page.tsx             ✅ form selector via CreateFormSelection [Phase D]; removed dead variables [Phase E]

### Deleted Files

```
components/features/data-management/device-detail/
  device-detail-form.tsx                ❌ DELETED [Phase E — legacy form replaced by DeviceFormSelection]
```
```

---

## 11. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Field tidak tampil setelah dipindah | High | Phase A: setiap ekstraksi diverifikasi dengan typecheck + build |
| Props interface berubah | Medium | Gunakan `DeviceFormProps` yang identik dengan props existing |
| ODP Operations Panel tidak muncul | High | Tetap di page level, tidak dipindahkan ke form |
| Splitter auto-fill logic broken | Medium | `SplitterRatioField` tetap di shared sections |
| Create form payload berubah | High | Tidak mengubah submit logic, hanya wrapping UI |
| Regression di non-ODC/ODP device | Medium | Generic fallback = kode existing, tidak ada perubahan |
| Field relasi topology belum ada di backend | High | Phase F dimulai setelah koordinasi dengan backend — cek API schema dulu |
| Lookup device by type lambat | Medium | Gunakan combobox dengan search + debounce, jangan load semua device sekaligus |
| Port lookup N+1 problem | High | Cache port list per device_id, hanya fetch saat device dipilih |

---

## 12. Verifikasi Per Phase

```bash
# Setelah setiap phase:
npm run lint
npm run build
npm run check:consistency
git diff --check
```

### Manual UAT Checklist

| Scenario | Phase |
|----------|-------|
| Buka detail ODC — cek semua field identity, relation, technical, location | B, C |
| Buka detail ODP — cek ODP-type, installation, port, splitter, operations | B, C |
| Buka detail OLT — cek management IP, core, port | B, C |
| Buka detail ONT — cek service ports, serial | B, C |
| Buka detail CABLE — cek capacity core, endpoint ports | B, C |
| Edit ODC — simpan, verifikasi data tersimpan | C |
| Edit ODP — simpan, verifikasi ODP operations tetap jalan | C |
| Create ODC — verifikasi field create form | D |
| Create ODP — verifikasi ODP-type, installation, splitter | D |
| Create CABLE — verifikasi cable type, length, capacity | D |
| Create generic device — verifikasi field standar | D |
| Edit ODC — pilih upstream device dan cable → simpan | F |
| Edit ODP — pilih source ODC dan port → simpan | F |
| Create CABLE — tentukan from/to device dan port → simpan | F |
| Create ONT — assign ke ODP port → simpan | F |

---

## 13. Stop Conditions

Pause dan review plan jika:

- Satu phase menyebabkan > 5 file berubah secara tidak terduga.
- Build broken setelah Phase A (shared sections) — artinya strategi extract perlu ditinjau ulang.
- Ada device type yang butuh field identity/relation/location berbeda secara fundamental.
- Performa page detail menurun karena re-render tidak perlu.
- **[BARU]** Backend belum mendukung lookup device by type — Phase F harus ditunda sampai API siap.
- **[BARU]** Port lookup menyebabkan terlalu banyak request — pertimbangkan batching di backend.

---

## 14. Definition of Done

Refactor dianggap selesai jika:

### Structural (Phase A–E)
- [ ] Semua device type detail menggunakan form masing-masing, bukan satu form besar.
- [ ] `device-detail-form.tsx` hanya menjadi wrapper backward-compat atau dihapus.
- [ ] Tidak ada conditional `isOdpDevice` atau `isOdcDevice` di form components.
- [ ] `DEVICE_TECHNICAL_COPY` dipindahkan ke shared helpers.
- [ ] Create form menggunakan selector per device type.
- [ ] Field identity, relation, location tetap shared (tidak duplikasi).
- [ ] `npm run lint` berhasil.
- [ ] `npm run build` berhasil.
- [ ] `npm run check:consistency` berhasil.
- [ ] UAT untuk ODC, ODP, OLT, ONT, CABLE, SWITCH, ROUTER, OTB, JC, HH/MH lolos.

### Relasi Topologi (Phase F)
- [ ] Operator bisa mendefinisikan upstream/downstream device dari form detail.
- [ ] ODC bisa dipilih sebagai source di ODP form.
- [ ] CABLE bisa dipilih with from/to device + port dari form.
- [ ] ONT bisa di-assign ke ODP port dari form.
- [ ] Topology summary otomatis ter-update setelah relasi disimpan.
- [ ] Tidak ada N+1 request yang tidak perlu saat membuka form.
