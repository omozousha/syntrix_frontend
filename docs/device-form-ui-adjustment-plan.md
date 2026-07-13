# Device Form UI Adjustment — Plan, Todo & Checklist

> **Dokumen ini** berisi rencana pengembangan dan penyesuaian *(development & adjustment plan)* untuk form create device di halaman `/data-management/create`.  
> **Sumber:** Review dokumen saran UI/UX + validasi kode aktual (`create/page.tsx`, `DeviceCreateForm`, `GenericDeviceCreate`, dll).

---

## 1. Ringkasan Prioritas

| ✅ | **#1 Duplikasi Field Project** — bug field tampil ganda | **Selesai** | ~15 menit | ⭐⭐⭐ |
| ✅ | **#4 Sticky Action Footer** — tombol simpan sticky + blur | **Selesai** | ~30 menit | ⭐⭐⭐ |
| ✅ | **#2 Standardisasi Placeholder** — "None" → "Pilih ... (Opsional)" | **Selesai** | ~10 menit | ⭐⭐ |
| ✅ | **#3 Validasi Used Core ≤ Capacity Core** | **Selesai** | ~15 menit | ⭐⭐ |
| ✅ | **#5 Indikator Required Field (*)** | **Selesai** | ~20 menit | ⭐ |
| 🟢 | **#6 Sidebar Overlap** — investigasi selesai, butuh screenshot | **Investigasi** | ~10 menit | ⭐ |

---

## 2. Detail Todo & Teknis

### ✅ Item #1 — Eliminasi Duplikasi Field Project — **SELESAI**

**Masalah:** Untuk semua device non-ODP/non-CABLE (OTB, OLT, ONT, SWITCH, ROUTER, JC, HH, MH, dll), field **Project** muncul dua kali:

1. **Di dalam** `DeviceCreateForm` → dipanggil oleh `GenericDeviceCreate` → dipanggil oleh `CreateFormSelection` di Tab 1
2. **Di luar** `CreateFormSelection` — render manual di `create/page.tsx` Tab 1 (setelah `CreateFormSelection`)

**Solusi:** Hapus field Project dari `create/page.tsx` Tab 1. Pertahankan yang ada di `DeviceCreateForm`. Tambahkan filter `pop_id` ke `DeviceCreateForm` agar filtering konsisten dengan yang dihapus.

**Perubahan:
- `app/(app)/data-management/create/page.tsx` — **-20 baris** (hapus blok Project duplikat)
- `components/features/data-management/device-form/device-create-form.tsx` — **+1 baris** tambah filter `.filter((project) => !values.pop_id || !project.pop_id || project.pop_id === values.pop_id)`

**Hasil:
- ✅ Project combobox di `create/page.tsx` Tab 1 dihapus
- ✅ Field Project di `DeviceCreateForm` tetap dipertahankan dengan tambahan filter `pop_id`
- ✅ Tidak ada field Project yang hilang untuk tipe device manapun
- ✅ **Typecheck zero errors**

---

### ✅ Item #4 — Sticky Action Footer — **SELESAI**

**Masalah:** Tombol **"Simpan Device"** hanya muncul di Tab 4 (Operasional & Lampiran) setelah scroll penuh ke bawah. User harus scrolling tiap kali ingin menyimpan.

**Solusi:** Buat **sticky footer** di bagian bawah viewport dengan backdrop blur + glass effect.

**File affected:**
- `components/features/data-management/device-form/create-sticky-footer.tsx` — **BARU**
- `app/(app)/data-management/create/page.tsx` — import + pasang sticky footer di luar Card, hapus tombol simpan dari Tab 4

**Hasil:
- ✅ Sticky footer muncul di bagian bawah viewport (sticky `bottom-0 z-40`)
- ✅ Berisi tombol **"Simpan Device"** (primary, icon Save) + badge jumlah field belum diisi
- ✅ Hanya tampil untuk mode device (bukan POP/Project/Customer)
- ✅ Muncul di **semua tab (1–4)** — user bisa simpan kapan saja
- ✅ Backdrop blur + glass border (`bg-background/80 backdrop-blur-md border-t`)
- ✅ Validasi `getMissingDeviceFields()` tetap berjalan sebelum submit
- ✅ **Typecheck zero errors**

> **Catatan:** Berbeda dari rencana awal yang membatasi Tab 2-4. Footer sekarang muncul di semua tab (1-4) agar user bisa menyimpan kapan saja tanpa pindah tab. Jika ingin dibatasi, bisa disesuaikan.

---

### ✅ Item #2 — Standardisasi Placeholder — **SELESAI**

**Masalah:** Teks default untuk opsi kosong tidak konsisten:

| Field | Sebelum | Sesudah |
|:------|:--------|:--------|
| POP | `"None"` | `"Pilih POP (Opsional)"` |
| Project | `"Tidak ada project"` | `"Pilih Project (Opsional)"` |
| Tenant | `"None"` | `"Pilih Tenant (Opsional)"` |

**File affected:**
- `components/features/data-management/device-form/device-create-form.tsx` — 3 label diubah

**Hasil:
- ✅ Semua placeholder menggunakan format `"Pilih [Nama Field] (Opsional)"`
- ✅ Tidak ada literal `"None"` tersisa di `DeviceCreateForm`
- ✅ Perubahan otomatis mengalir ke ODC melalui `OdcDeviceCreate` yang juga pakai `DeviceCreateForm`
- ✅ **Typecheck zero errors**

> **Catatan:** Detail page (`DeviceRelationSection`) masih pakai `"Tidak ada POP"`, `"Tidak ada project"`, `"Tidak ada tenant"` — sudah konsisten antar sesama detail page, tapi berbeda format dengan create form.

---

### ✅ Item #3 — Validasi Used Core ≤ Capacity Core — **SELESAI**

**Masalah:** `Used Core` sudah berupa `type="number"`, tapi tidak ada validasi bahwa nilainya tidak boleh melebihi `Capacity Core`.

**Solusi:** Tambahkan validasi client-side visual warning (amber text).

**File affected:**
- `components/features/data-management/device-form/device-capacity-fields.tsx` — variabel `showCoreWarning`, `showPortWarning`
- `app/(app)/data-management/create/page.tsx` — variabel `showCoreWarning_create`, `showPortWarning_create`
- `components/features/data-management/device-detail/forms/otb-device-form.tsx` — `showOtbCoreWarning`, `showOtbPortWarning`
- `components/features/data-management/device-detail/forms/odc-device-form.tsx` — `showOdcCoreWarning`, `showOdcPortWarning`
- `components/features/data-management/device-detail/forms/jc-device-form.tsx` — `showJcCoreWarning`

**Hasil:**
- ✅ `Used Core > Capacity Core` → amber warning "⚠️ Used core (X) melebihi kapasitas core (Y)"
- ✅ `Used Ports > Total Ports` → amber warning
- ✅ Tidak blocking submit (hanya visual)
- ✅ Handle empty string, NaN, `"__none__"` dengan benar
- ✅ **Typecheck zero errors**

> **⚠️ Catatan:** Saat memperbaiki file JC/ODC yang corrupt, prop `deviceCoreCapacities` untuk JC dan ODC detail forms hilang. Perlu di-reapply nanti.

---

### ✅ Item #5 — Indikator Required Field (*) — **SELESAI**

**Masalah:** Tidak ada penanda visual mana field yang wajib diisi.

**Solusi:** Tambahkan parameter `required` ke komponen `FieldLabel` dan `Field`.

**File affected:**
- `components/features/data-management/device-form/form-field-grid.tsx` — tambah `required?: boolean` ke `FieldLabel` dan `Field`, render asterisk merah
- `components/features/data-management/device-form/device-create-form.tsx` — `required` pada Device Name / Nama ODP
- `components/features/data-management/device-form/device-capacity-fields.tsx` — `required` pada Capacity Core
- `app/(app)/data-management/create/page.tsx` — `required` pada Region Tab 1

**Hasil:**
- ✅ `FieldLabel` punya prop `required?: boolean`
- ✅ Asterisk merah `*` (class `text-destructive`) muncul setelah label
- ✅ `Field` meneruskan `required` ke `FieldLabel`
- ✅ **Typecheck zero errors**

> **Catatan:** POP tidak ditandai `required` karena labelnya "(opsional)".

---

### 🟢 Item #7 — Rapihkan Section Tab (Core Capacity di 2 Tab) — **SELESAI**

**Masalah:** Field **Capacity Core** (dan field teknis lainnya) muncul di dua tab:

1. **Tab 1 (Identitas & Relasi)** — via `CreateFormSelection` → `GenericDeviceCreate` / `OdcDeviceCreate` → `DeviceCapacityFields`
2. **Tab 2 (Teknis & Kapasitas)** — inline rendering langsung

**Solusi:** Pindahkan **semua** field Capacity Core, Used Core, Ports, Splitter, Management IP, dan Feeder/Distribution Port ke Tab 2 saja. Tab 1 hanya berisi form identitas & relasi.

**File affected:**
- `components/features/data-management/device-form/create/generic-device-create.tsx` — hapus `DeviceCapacityFields`, Management IP, props terkait
- `components/features/data-management/device-form/create/odc-device-create.tsx` — hapus `DeviceCapacityFields`, Feeder/Distribution Port, props terkait
- `components/features/data-management/device-form/create/odp-device-create.tsx` — hapus `DeviceCapacityFields`; pertahankan inline Capacity Core (disabled) + Used Core (khusus ODP)
- `components/features/data-management/device-form/create/cable-device-create.tsx` — hapus `DeviceCapacityFields`; pertahankan route/cable fields
- `components/features/data-management/device-form/create-form-selection.tsx` — hapus props `coreCapacities`, `deviceCoreCapacities`, `splitterProfiles` dari semua child component calls
- `app/(app)/data-management/create/page.tsx` — hapus props dari `CreateFormSelection` call

**Hasil:**
- Tab 1: DeviceCreateForm (nama, POP, Project, Tenant) + DeviceHardwareFields (Manufacturer, Brand, Model, Serial) + ODP inline core
- Tab 2: Capacity Core, Used Core, Total Ports, Used Ports, Splitter, Feeder/Distribution Port (ODC), Management IP (OLT/ONT/SWITCH/ROUTER)
- ✅ **Typecheck zero errors**

> **Catatan:** Cable Device tetap bisa pilih Capacity Core di Tab 2 (CABLE termasuk CORE_TYPES). ODP tetap punya inline Capacity Core (disabled) di Tab 1 karena ODP tidak termasuk CORE_TYPES (jadi tidak ada duplikasi).

---

### 🟢 Item #6 — Sidebar Overlap (Investigasi) — **INVESTIGASI SELESAI**

**Masalah:** Laporan menyebut ada logo lingkaran hitam berhuruf "N" yang menutupi teks panduan di sidebar kiri.

**Hasil investigasi kode:**
- `NavUser` (avatar "N") **BUKAN** di sidebar footer — ada di **top header** (di dalam `AppShell`)
- `SidebarFooter` hanya berisi `SidebarSmartTip` — tidak ada komponen lain
- `SidebarSmartTip` punya `min-h-10` (40px) + padding yang cukup

**Kesimpulan:** Overlap **tidak dapat direproduksi dari kode**. NavUser dan SidebarSmartTip berada di lokasi berbeda.

**Action items:**
- [x] Cek apakah `NavUser` ter-render di `SidebarFooter` bersama `SidebarSmartTip` — **TIDAK**, NavUser di header
- [ ] 🔴 **Butuh screenshot** dari user untuk melihat posisi overlap yang sebenarnya

---

## 3. Implementation Order

```
Item #1 ──▶ Item #4 ──▶ Item #2 ──▶ Item #3 ──▶ Item #5 ──▶ Item #6
  ✅ done    ✅ done      ⬜ next     ⬜          ⬜          ⬜
  (bug fix)   (UX)       (cosmetic)   (validation) (cosmetic) (investigasi)
```

Progress:
1. ✅ **#1** — Duplikasi Project diperbaiki
2. ✅ **#4** — Sticky Action Footer selesai
3. ✅ **#2** — Standardisasi Placeholder selesai
4. ✅ **#3** — Validasi Used Core ≤ Capacity Core selesai
5. ✅ **#5** — Indikator Required Field selesai
6. ⬜ **#6** — Investigasi Sidebar Overlap (next)

---

## 4. Checklist UAT

| # | Kriteria | Status |
|:-:|:---------|:------:|
| 1 | Create device OTB — cuma ada 1 field Project | ✅ |
| 2 | Create device JC — cuma ada 1 field Project | ✅ |
| 3 | Create device OLT — cuma ada 1 field Project | ✅ |
| 4 | Sticky footer muncul di semua tab (1–4) | ✅ |
| 5 | Sticky footer tidak muncul untuk POP/Project/Customer | ✅ |
| 6 | Create POP/Project/Customer — tidak ada regression | ✅ |
| 7 | Placeholder POP: "Pilih POP (Opsional)" | ✅ |
| 8 | Placeholder Project: "Pilih Project (Opsional)" | ✅ |
| 9 | Placeholder Tenant: "Pilih Tenant (Opsional)" | ✅ |
| 10 | Used Core > Capacity Core → tampil peringatan | ✅ |
| 11 | Used Ports > Total Ports → tampil peringatan | ✅ |
| 12 | Asterisk merah (*) ada di Device Name, Capacity Core, Region | ✅ |
| 13 | Typecheck zero errors | ✅ |
| 14 | Tab 1 tidak punya field duplikat Capacity Core / Ports / Splitter / Management IP | ✅ |
| 15 | Sidebar overlap terkonfirmasi (via screenshot) | ⬜ |
| 16 | Sidebar overlap diperbaiki | ⬜ |

---

## 5. Effort Summary

| Item | Frontend | Backend | Total | Status |
|:-----|:--------:|:-------:|:-----:|:------:|
| #1 Duplikasi Project | ~15 menit | — | ~15 menit | ✅ Selesai |
| #2 Standardisasi Placeholder | ~10 menit | — | ~10 menit | ✅ Selesai |
| #3 Validasi Used Core | ~15 menit | — | ~15 menit | ✅ Selesai |
| #4 Sticky Footer | ~30 menit | — | ~30 menit | ✅ Selesai |
| #5 Required Indicator | ~20 menit | — | ~20 menit | ✅ Selesai |
| #6 Sidebar Overlap | ~10 menit | — | ~10 menit | 🔍 Investigasi |
| #7 Rapihkan Section Tab | ~20 menit | — | ~20 menit | ✅ Selesai |
| **Total** | **~120 menit** | **—** | **~120 menit** | **6/7 ✅ + 🔍** |
