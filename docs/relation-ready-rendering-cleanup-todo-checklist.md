# Relation-Ready Rendering Cleanup Todo Checklist

Tanggal: 7 Juni 2026

## Tujuan

Membersihkan sisa implementasi Relation-Ready Rendering agar frontend web dan Syntrix-One app tidak hanya aman secara tampilan, tetapi juga lebih ringan, cepat, konsisten, dan siap untuk penambahan halaman/komponen baru tanpa mengulang pekerjaan yang sama.

## Definisi Metode

**Relation-Ready Rendering** adalah pola render Syntrix yang memastikan semua data relasi user-facing sudah berbentuk label manusiawi sebelum tampil ke UI.

Contoh relasi:

- `region_id` -> nama region, misalnya `Jabodebek`.
- `pop_id` -> nama/kode POP, misalnya `Parung | PRG`.
- `tenant_id` -> nama tenant.
- `device_type_id` atau `device_type_key` -> label tipe device.
- `brand_id`, `model_id`, `manufacturer_id` -> label vendor/hardware.
- `customer_id` -> nama customer atau CID.
- `project_id` -> nama/kode project.

Aturan utama:

- ID teknis boleh dipakai sebagai value internal form, query param, API payload, dan hidden identifier.
- ID teknis tidak boleh menjadi fallback label user-facing.
- Field bisnis seperti `Inventory ID`, `CID`, `Request ID`, `Document ID`, `POP Code`, dan `Region Code` tetap boleh tampil karena memang identifier bisnis.
- Attachment, gallery, port detail, dan history tetap lazy loaded.

## Kondisi Saat Ini

Status user-facing:

- [x] Strict relation display audit sudah pass.
- [x] Performance safety audit sudah pass.
- [x] Frontend consistency check sudah pass.
- [x] Layout/data flash critical pada detail ODP sudah tertangani.
- [x] Syntrix-One detail/history sudah tidak menampilkan raw region/POP ID pada flow yang sudah diuji.

Sisa pekerjaan:

- Cleanup manual relation fallback fetch di route frontend.
- Standarisasi route yang masih memakai map lokal.
- Perkuat guardrail agar halaman/komponen baru otomatis mengikuti metode ini.
- Dokumentasikan standar review agar agent berikutnya konsisten.

## Phase 1 - Final Audit Scope

Tujuan: membedakan mana `*_id` yang memang internal dan mana yang masih perlu cleanup Relation-Ready Rendering.

### Todo

- [x] Jalankan audit informational:
  - `npm run audit:relation-display`
  - `npm run audit:relation-display -- --strict`
  - `npm run audit:performance-safety`
  - `npm run check:consistency`
- [x] Klasifikasikan temuan informational ke 3 kategori:
  - Internal form/query/API value.
  - User-facing display label.
  - Performance cleanup/manual fallback fetch.
- [x] Tandai file yang hanya memakai ID internal sebagai aman.
- [x] Tandai file yang masih memakai manual fallback fetch sebagai target cleanup.

### Checker

- [x] Tidak ada temuan strict.
- [x] Semua temuan informational punya keputusan: keep, refactor, atau guardrail exception.

## Phase 2 - Frontend Device Detail Cleanup

Target utama:

```txt
app/(app)/data-management/list/[slug]/[id]/page.tsx
```

Masalah yang ingin dibersihkan:

- Detail page masih memiliki fallback fetch manual ke endpoint relasi kecil seperti:
  - `/regions/:id`
  - `/pops/:id`
  - `/manufacturers/:id`
  - `/brands/:id`
  - `/assetModels/:id`
  - `/tenants/:id`
  - `/projects/:id`
  - `/serviceTypes/:id`
- Tampilan sudah aman, tetapi pola ini bisa menambah request kecil dan membuat maintenance lebih berat.

### Todo

- [x] Audit semua manual relation fetch di detail page.
- [x] Pastikan backend enriched response sudah menyediakan label relasi utama.
- [x] Ganti fallback relation fetch dengan:
  - enriched relation object dari `item`
  - shared reference cache dari `useReferenceData`
  - resolver dari `lib/relation-labels.ts`
  - adapter dari `lib/display-adapters/*`
- [x] Pertahankan lazy fetch untuk data berat:
  - gallery/image attachments
  - ports
  - validation history
  - topology trace detail
- [x] Hapus state/effect yang hanya dipakai untuk fallback relation fetch kecil jika sudah tidak dibutuhkan.

### Checker

- [x] Detail ODP tetap menampilkan region, POP, tenant, vendor, brand, model, dan service type dengan label manusiawi.
- [x] Tidak ada request kecil tambahan untuk region/POP/tenant/vendor jika data sudah ada di enriched response/reference cache.
- [x] Gallery, ports, dan history tetap lazy.
- [x] `npm run audit:relation-display -- --strict` pass.
- [x] `npm run audit:performance-safety` pass.
- [x] `npm run check:consistency` pass.
- [x] `npm run lint` pass.
- [x] `npm run build` pass.

## Phase 3 - Frontend Route Reference Cache Cleanup

Target route:

```txt
app/(app)/data-management/as-built-documents/page.tsx
app/(app)/data-management/topology/page.tsx
app/(app)/dashboard/page.tsx
app/(app)/profile/page.tsx
app/(app)/account-management/page.tsx
```

Tujuan:

- Route yang masih membangun `regionNameMap`, `popMap`, atau map lokal serupa dipindahkan bertahap ke shared reference cache.
- Map lokal tetap boleh ada jika datanya berasal dari cache yang sama, bukan fetch bespoke yang berulang.

### Todo

- [x] Audit route yang masih fetch `/regions`, `/pops`, `/tenants`, `/projects`, atau master data hanya untuk label.
- [x] Ganti fetch label-only dengan `useReferenceData`.
- [x] Gunakan resolver:
  - `getRegionLabel`
  - `getPopLabel`
  - `getTenantLabel`
  - `getProjectLabel`
  - resolver lain sesuai relasi.
- [x] Pastikan filter combobox tetap memakai ID sebagai `value`, tetapi option label memakai nama/kode bisnis.
- [x] Pertahankan role scope adminregion dan validator.

### Checker

- [x] Navigasi dashboard -> data-management -> detail tidak refetch reference data berlebihan.
- [x] Region filter tetap menampilkan nama/kode region, bukan UUID.
- [x] Adminregion hanya melihat region scope yang diizinkan.
- [x] `npm run audit:relation-display -- --strict` pass.
- [x] `npm run audit:performance-safety` pass.

## Phase 4 - Form Component Standardization

Target component:

```txt
components/features/data-management/device-form/device-create-form.tsx
components/features/data-management/device-form/customer-create-form.tsx
components/features/data-management/device-form/device-hardware-fields.tsx
components/features/data-management/device-form/route-create-form.tsx
components/features/data-management/device-form/project-create-form.tsx
components/features/account-management/create-account-sheet.tsx
components/features/account-management/edit-account-sheet.tsx
components/features/data-management/device-detail/device-detail-form.tsx
components/features/data-management/device-detail/odp-port-section.tsx
```

Catatan:

- `value={..._id}` pada combobox/select adalah benar dan tidak perlu dihapus.
- Yang harus distandarkan adalah option label dan summary label.

### Todo

- [x] Pastikan setiap combobox/select punya option label dari nama/kode bisnis.
- [x] Hindari label fallback ke UUID jika option tidak ditemukan.
- [x] Tambahkan helper label reusable bila ada pola berulang.
- [x] Pastikan customer memakai `CID` / `customer_number` jika tersedia.
- [x] Pastikan POP option menampilkan nama/kode POP.
- [x] Pastikan tenant, brand, model, manufacturer memakai label master data.

### Checker

- [x] Form create/edit tetap mengirim ID sebagai payload.
- [x] Label option tidak menampilkan UUID.
- [x] Empty option memakai `Tanpa ...`, `Pilih ...`, atau `-` sesuai konteks.
- [x] `npm run audit:relation-display -- --strict` pass.

## Phase 5 - Request, History, Audit, dan Trash Cleanup

Target route/component:

```txt
app/(app)/requests/page.tsx
app/(app)/validation-requests/page.tsx
app/(app)/audit-trail/page.tsx
app/(app)/trash/page.tsx
components/features/data-management/device-detail/odp-validation-history-section.tsx
```

Tujuan:

- Request approval, history, audit, dan trash tetap memakai nama bisnis, bukan ID teknis.
- Field ID bisnis tetap boleh tampil jika memang konteksnya audit/identifier.

### Todo

- [x] Pastikan request cards memakai request display adapter.
- [x] Pastikan request comparison memakai resolver untuk relasi lama/baru.
- [x] Pastikan Submitted By, reviewer, validator, adminregion approver memakai nama/email, bukan UUID.
- [x] Pastikan audit trail memilih nama bisnis sebelum `entity_id`.
- [x] Pastikan trash list menampilkan identifier bisnis dan display name.
- [x] Pastikan history evidence/attachment tetap lazy.

### Checker

- [x] Request approval tidak flash dari ID ke label.
- [x] History validasi menampilkan nama validator dan approver jika tersedia.
- [x] Audit/trash tidak menampilkan UUID sebagai label utama kecuali tidak ada data bisnis sama sekali.
- [x] `npm run audit:relation-display -- --strict` pass.

## Phase 6 - Syntrix-One App Cleanup

Target folder:

```txt
syntrix_app/src
```

Flow target:

- QR scanner.
- Device detail.
- Validation form.
- Region mismatch screen.
- Asset browser.
- Validation history.
- Mini gallery.

### Todo

- [x] Audit `syntrix_app/src` untuk raw relation fallback.
- [x] Pastikan scan QR memakai loading boundary sampai device context/detail siap.
- [x] Pastikan detail ODP memakai enriched labels:
  - region
  - POP
  - tenant
  - device type
  - status validasi
- [x] Pastikan validation form target info tidak menampilkan raw ID.
- [x] Pastikan region mismatch dialog/screen menampilkan region sumber dan region akun secara jelas.
- [x] Pastikan history menampilkan:
  - nama validator
  - nama adminregion approver
  - nama superadmin approver jika tersedia
  - tanggal submit/approve
- [x] Pastikan gallery mengambil image attachment setelah approval final.
- [x] Pastikan app tidak melakukan fetch kecil berulang hanya untuk label yang sudah ada di device detail/reference data.

### Checker

- [x] Scan QR region sesuai -> masuk form tanpa raw ID flash.
- [x] Scan QR region berbeda -> dialog/screen blokir dengan informasi region yang spesifik.
- [x] Detail ODP tidak menampilkan UUID region/POP/tenant.
- [x] History tidak kosong jika backend mengirim approved validation history.
- [x] Mini gallery tampil jika backend mengirim approved image attachments.
- [x] `npm run lint` pass di `syntrix_app`.
- [x] `npm run build` pass di `syntrix_app`.
- [x] `npx cap sync android` pass.
- [x] Android `assembleDebug` pass.
- [x] Install dan UAT device fisik jika ADB tersedia.

## Phase 7 - Guardrail Upgrade

Tujuan: halaman/komponen baru otomatis dicegah dari pola lama.

### Todo

- [x] Tambahkan mode audit baru untuk manual relation fetch:
  - `/regions/:id`
  - `/pops/:id`
  - `/tenants/:id`
  - `/brands/:id`
  - `/assetModels/:id`
  - `/manufacturers/:id`
  - `/projects/:id`
  - `/serviceTypes/:id`
- [x] Bedakan manual fetch yang valid:
  - fetching detail resource utama
  - form data-flow
  - query param/internal payload
- [x] Tambahkan rule warning untuk manual relation fetch label-only.
- [x] Bersihkan allowlist existing cleanup target sampai kosong.
- [x] Tambahkan allowlist eksplisit untuk field bisnis:
  - `inventory_id`
  - `device_id`
  - `customer_number`
  - `request_id`
  - `document_id`
  - `pop_code`
  - `region_code`
- [x] Integrasikan audit baru ke `npm run check:consistency`.
- [x] Update docs developer dengan contoh benar/salah.

### Checker

- [x] Build/check gagal jika komponen baru menampilkan raw relation ID sebagai fallback label.
- [x] Check memberi warning jika halaman existing masih membuat manual relation fetch label-only.
- [x] Check gagal jika halaman baru membuat manual relation fetch label-only di luar allowlist.
- [x] Allowlist tidak memblok identifier bisnis yang memang perlu tampil.

## Phase 8 - Agent/Skill Standard Update

Tujuan: agent berikutnya otomatis menerapkan Relation-Ready Rendering saat membuat halaman/komponen baru.

Target skill:

```txt
syntrix_frontend/.agents/skills/redesign-existing-projects/SKILL.md
```

### Todo

- [x] Tambahkan section **Relation-Ready Rendering** ke skill frontend.
- [x] Tambahkan aturan wajib untuk halaman/komponen baru:
  - gunakan enriched backend response
  - gunakan `useReferenceData`
  - gunakan resolver/display adapter
  - jangan fallback ke raw relation ID
  - tampilkan skeleton/loading stabil
  - attachment/gallery/history tetap lazy
- [x] Tambahkan checklist sebelum final:
  - `npm run audit:relation-display -- --strict`
  - `npm run audit:performance-safety`
  - `npm run check:consistency`
  - lint/build sesuai scope
- [x] Tambahkan contoh benar/salah.
- [x] Pastikan skill tidak bertentangan dengan Karpathy Guidelines.

### Checker

- [x] Skill frontend menyebut Relation-Ready Rendering secara eksplisit.
- [x] Agent punya standar yang sama untuk route baru, component baru, dan app screen baru.
- [x] Tidak ada instruksi dobel di backend `AGENTS.md`.

## Standard Wajib Untuk Halaman/Komponen Baru

Gunakan pertanyaan review ini sebelum membuat atau mengubah halaman/komponen:

- Apakah halaman ini menampilkan region, POP, tenant, device type, vendor, customer, project, atau service type?
- Apakah data relasi sudah ada di enriched response?
- Jika belum, apakah memakai shared reference cache?
- Apakah label tampil lewat resolver/adapter?
- Apakah fallback bukan raw UUID/ID teknis?
- Apakah loading state stabil dan tidak menyebabkan layout flash?
- Apakah field ID hanya dipakai untuk form value/query/API payload?
- Apakah attachment/gallery/history tetap lazy?
- Apakah role scope tetap dari backend?
- Apakah checker relation/performance/consistency sudah pass?

## Contoh Benar dan Salah

### Benar

```tsx
const regionLabel = getRegionLabel({
  relation: device.region,
  fallback: referenceRegionMap.get(device.region_id),
});

return <span>{regionLabel}</span>;
```

Kenapa benar:

- `region_id` hanya dipakai sebagai lookup key.
- UI menerima label dari relation object/reference cache.
- Resolver mencegah UUID tampil sebagai fallback.

### Salah

```tsx
return <span>{device.region_name || device.region_id}</span>;
```

Kenapa salah:

- Jika `region_name` belum siap, user melihat ID teknis.
- Pola ini menyebabkan data flash dari UUID ke label.

### Benar Untuk Form

```tsx
<Combobox
  value={form.region_id}
  options={regions.map((region) => ({
    value: region.id,
    label: getRegionLabel({ relation: region }),
  }))}
/>
```

Kenapa benar:

- Form tetap menyimpan ID untuk payload.
- Option label tetap memakai nama region.

### Salah Untuk Form

```tsx
<Combobox
  value={form.region_id}
  options={regions.map((region) => ({
    value: region.id,
    label: region.id,
  }))}
/>
```

Kenapa salah:

- User melihat UUID sebagai label option.
- Tidak mengikuti Relation-Ready Rendering.

## Urutan Implementasi Disarankan

1. Phase 7 guardrail upgrade.
2. Phase 2 device detail cleanup.
3. Phase 3 route reference cache cleanup.
4. Phase 4 form component standardization.
5. Phase 5 request/history/audit/trash cleanup.
6. Phase 6 Syntrix-One app cleanup.
7. Phase 8 agent/skill standard update.

Alasan:

- Guardrail dulu membuat cleanup berikutnya lebih aman.
- Device detail adalah route paling kompleks dan paling sering dipakai.
- Route reference cache memberi efek performa lintas halaman.
- Form dan audit/trash cenderung aman karena banyak ID internal yang memang valid.
- App cleanup dilakukan setelah web pattern stabil agar tidak beda standar.
