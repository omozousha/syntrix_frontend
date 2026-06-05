# Frontend Relation Display Architecture Plan

Tanggal: 5 Juni 2026

## Tujuan

Menghilangkan gejala layout/data flash saat halaman Syntrix menampilkan ID relasi mentah sebelum berubah menjadi label manusiawi, misalnya `region_id` tampil dulu lalu berubah menjadi `Jabodebek`. Rencana ini juga menyiapkan pola yang scalable untuk semua halaman frontend, backend Vercel serverless, database Nhost.io, dan aplikasi Syntrix-One.

## Masalah Saat Ini

Beberapa halaman menampilkan data utama lebih dulu, lalu mengambil relasi tambahan secara async. Contoh di detail ODP:

- Device detail sudah memiliki `region_id`, `pop_id`, `tenant_id`, `brand_id`, `model_id`.
- UI merender fallback `item.region_id` atau `item.pop_id`.
- `useEffect` berikutnya memanggil endpoint relasi seperti `/regions/:id` dan `/pops/:id`.
- Setelah response datang, label berubah dari UUID/ID menjadi nama region/POP.

Dampak:

- UI terasa lambat dan tidak stabil.
- User melihat ID teknis yang tidak relevan.
- Layout bisa berubah setelah binding data selesai.
- Banyak request kecil dari browser ke backend Vercel, lalu ke Nhost.
- Risiko pola yang sama muncul di list, detail, request approval, history, QR fallback, dan app.

## Prinsip Solusi

- User-facing UI tidak boleh menampilkan UUID/ID relasi mentah sebagai fallback.
- Endpoint core harus display-ready untuk field relasi penting.
- Data berat tetap lazy loaded agar payload tidak membengkak.
- Reference/master data harus bisa di-cache di frontend dan backend.
- Frontend component tidak boleh membuat logic label relasi sendiri-sendiri.
- Perubahan harus bertahap, terukur, dan aman untuk Vercel serverless + Nhost.io.

## Stack Constraint

### Vercel Frontend dan Backend

- Hindari N+1 request dari browser.
- Hindari endpoint yang memaksa backend melakukan query besar untuk semua kebutuhan sekaligus.
- Gunakan payload ringkas dan endpoint batch untuk data referensi.
- Short-lived cache aman digunakan sebagai optimasi, bukan source of truth.

### Nhost.io Database/Auth/Storage

- Query relasi harus eksplisit dan terkontrol.
- Attachment/storage tetap lazy, terutama gallery dan evidence.
- Auth/role filtering tetap dilakukan di backend.
- Jangan pindahkan data-sensitive join ke frontend.

### Syntrix-One App

- App perlu display label yang sama dengan web.
- QR scan/detail/validation/history tidak boleh menampilkan ID relasi mentah.
- Mobile harus tetap ringan, dengan data berat lazy loaded.

## Keputusan Library Data Fetching

Frontend saat ini sudah memakai `@tanstack/react-table`, tetapi belum memakai `@tanstack/react-query`. Untuk mengatasi relation display flash secara matang dan scalable, rencana ini menetapkan TanStack Query sebagai layer fetch/cache standar di frontend web.

TanStack Query dipakai untuk:

- Cache reference data lintas halaman.
- Menghindari request berulang saat user pindah list-detail-list.
- Menyatukan loading/error state.
- Invalidate data setelah create/edit/delete/approval.
- Mengurangi gejala ID tampil sementara sebelum label relasi siap.

TanStack Query tidak menggantikan backend enriched response. Backend tetap source of truth dan tetap harus mengirim response display-ready untuk endpoint core. Query cache hanya optimasi UX dan orchestration fetch di browser.

## Target Architecture

### 1. Backend Enriched Core Response

Endpoint detail/list mengembalikan data utama plus relasi ringkas yang dibutuhkan untuk display.

Contoh `GET /api/v1/devices/:id`:

```json
{
  "id": "device-id",
  "device_name": "PRG-45",
  "inventory_id": "INV-2026/03/010/0062",
  "region_id": "region-id",
  "region": {
    "id": "region-id",
    "region_name": "Jabodebek",
    "region_code": "JBD"
  },
  "pop_id": "pop-id",
  "pop": {
    "id": "pop-id",
    "pop_name": "Parung",
    "pop_code": "PRG"
  },
  "tenant_id": "tenant-id",
  "tenant": {
    "id": "tenant-id",
    "tenant_name": "Fiberpro",
    "tenant_code": "FBR"
  }
}
```

Relasi ringkas yang direkomendasikan:

- `region`: `id`, `region_name`, `region_code`
- `pop`: `id`, `pop_name`, `pop_code`, `region_id`
- `tenant`: `id`, `tenant_name`, `tenant_code`
- `device_type`: `id`, `device_type_name`, `device_type_code`, `device_type_key`
- `manufacturer`: `id`, `manufacturer_name`
- `brand`: `id`, `brand_name`
- `model`: `id`, `model_name`, `brand_id`, `manufacturer_id`
- `odp_type`: `id`, `odp_type_name`, `odp_type_code`
- `installation_type`: `id`, `installation_type_name`, `installation_type_code`
- `splitter_profile`: `id`, `splitter_ratio`
- `service_type`: `id`, `service_type_name`, `service_type_code`

### 2. Backend Heavy Data Tetap Lazy

Jangan gabungkan semua data berat ke endpoint core.

Tetap lazy:

- `GET /api/v1/devices/:id/attachments`
- `GET /api/v1/devices/:id/ports`
- `GET /api/v1/devices/:id/validation-history`
- `GET /api/v1/devices/:id/service-relations`
- `GET /api/v1/devices/:id/core-chain-summary`

Tujuannya halaman detail cepat stabil, sementara section berat punya loading boundary sendiri.

### 3. Backend Reference Data Batch Endpoint

Tambahkan endpoint batch untuk master/reference data yang sering dipakai.

Contoh:

```txt
GET /api/v1/reference-data?groups=regions,pops,tenants,deviceTypes,brands,models
```

Response:

```json
{
  "regions": [],
  "pops": [],
  "tenants": [],
  "deviceTypes": [],
  "brands": [],
  "models": []
}
```

Catatan:

- Batasi kolom hanya untuk display dan filtering.
- Gunakan query param `region_id` jika perlu.
- Terapkan role filter untuk adminregion.
- Gunakan TTL cache pendek di backend jika aman.

### 4. Frontend Relation Label Resolver

Buat resolver terpusat:

```txt
syntrix_frontend/lib/relation-labels.ts
```

Tanggung jawab:

- Menghasilkan label user-facing.
- Tidak pernah mengembalikan UUID mentah.
- Menentukan fallback konsisten.
- Menentukan status loading/missing.

Contoh API:

```ts
getRegionLabel(item, references)
getPopLabel(item, references)
getTenantLabel(item, references)
getDeviceTypeLabel(item, references)
getRelationDisplay({
  id,
  relation,
  cache,
  type,
  loading,
})
```

Fallback standar:

- Loading: `Memuat...`
- Missing/unknown: `Data tidak tersedia`
- Empty optional: `-`
- Debug-only ID: hanya boleh tampil jika field memang bernama `ID` atau mode developer.

### 5. Frontend Normalized Display Adapter

Buat adapter agar setiap page memakai shape display yang sama.

Contoh file:

```txt
syntrix_frontend/lib/device-display-adapter.ts
syntrix_frontend/lib/request-display-adapter.ts
syntrix_frontend/lib/history-display-adapter.ts
```

Contoh output:

```ts
type DeviceDisplay = {
  id: string;
  title: string;
  subtitle: string;
  regionLabel: string;
  popLabel: string;
  tenantLabel: string;
  deviceTypeLabel: string;
  validationStatusLabel: string;
  relationLoading: boolean;
};
```

Komponen UI membaca `display.regionLabel`, bukan lagi `item.region_id`.

### 6. Frontend Global Reference Cache

Buat hook/cache untuk data referensi:

```txt
syntrix_frontend/lib/reference-data-cache.ts
syntrix_frontend/hooks/use-reference-data.ts
```

Kebutuhan:

- Cache regions, POP, tenants, device types, brands, models.
- Stale time 5-15 menit.
- Invalidate setelah create/edit/delete master data.
- Bisa dipakai list, detail, form, request, history.
- Tidak memblok seluruh halaman jika cache belum ada.

Implementasi cache direkomendasikan memakai TanStack Query, bukan cache manual jangka panjang.

File yang direkomendasikan:

```txt
syntrix_frontend/components/providers/query-provider.tsx
syntrix_frontend/hooks/use-reference-data.ts
syntrix_frontend/hooks/use-device-detail.ts
syntrix_frontend/hooks/use-device-list.ts
syntrix_frontend/hooks/use-validation-request.ts
syntrix_frontend/hooks/use-validation-history.ts
```

Instalasi:

```txt
npm install @tanstack/react-query
```

Devtools bersifat opsional dan tidak wajib pada phase awal.

### 6A. TanStack Query Strategy

Default config awal:

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

Rekomendasi stale time per domain:

- Reference data: 5-15 menit.
- Device detail: 30-60 detik, atau invalidate setelah mutation.
- Device list: 30-60 detik, tergantung filter/pagination.
- Request approval: 15-30 detik, atau invalidate setelah approve/reject.
- Validation history: 30-60 detik, invalidate setelah submit/approval.
- QR public fallback: 1-5 menit, karena data public harus ringan.

Query key convention:

```ts
["reference-data", { groups, scope }]
["device-detail", deviceId]
["device-list", { slug, filters, page, limit }]
["validation-request", requestId]
["validation-requests", { filters, page, limit }]
["validation-history", { deviceId }]
["master-data", { type, filters }]
["qr-public-device", deviceId]
```

Invalidation rules:

- Setelah create/edit/delete master data:
  - invalidate `["reference-data"]`
  - invalidate `["master-data"]`
- Setelah create/edit/delete device:
  - invalidate `["device-list"]`
  - invalidate `["device-detail", deviceId]`
  - invalidate `["reference-data"]` jika relasi master ikut berubah.
- Setelah submit validasi:
  - invalidate `["device-detail", deviceId]`
  - invalidate `["validation-history", { deviceId }]`
  - invalidate `["validation-requests"]`
- Setelah approve/reject adminregion/superadmin:
  - invalidate `["validation-request", requestId]`
  - invalidate `["validation-requests"]`
  - invalidate `["device-detail", deviceId]`
  - invalidate `["validation-history", { deviceId }]`
- Setelah update QR label settings:
  - invalidate query QR label settings.
  - regenerate/download QR label memakai setting terbaru.

Provider placement:

- Pasang `QueryProvider` di root app layout yang membungkus route authenticated.
- Jangan membuat `QueryClient` baru per halaman.
- Query hook tidak boleh dipanggil di utility pure function atau display adapter.
- Display adapter menerima data yang sudah tersedia dari hook/page.

Vercel/Nhost compatibility:

- Query cache mengurangi repeated client fetch saat navigasi.
- Backend tetap melakukan role filtering dan join sensitif.
- Cache browser tidak boleh dianggap otorisasi.
- Data stale sementara masih aman karena mutation penting harus invalidate.

### 7. Section Loading Boundary

Setiap halaman detail dibagi menjadi section:

- Core identity
- Relationship/vendor
- Capacity/network
- Ports
- Gallery
- Validation history
- Operations

Aturan:

- Section core jangan tampilkan ID mentah.
- Jika relasi belum siap, tampilkan skeleton/`Memuat...`.
- Section berat tetap lazy dengan loader masing-masing.

### 8. UI Guard: No Raw Relation ID

Tambahkan convention dan checker.

Larangan di component user-facing:

```tsx
value={item.region_id}
value={item.pop_id}
value={item.tenant_id}
relationLabels.region || item.region_id
relationLabels.pop || item.pop_id
```

Yang benar:

```tsx
value={display.regionLabel}
value={display.popLabel}
value={getRelationLabel(...)}
```

## Phase Plan

## Phase 1 - Audit dan Rule Dasar

Tujuan: menemukan semua titik raw ID fallback dan menentukan standar display.

### Todo

- [x] Audit semua halaman yang menampilkan relasi:
  - [x] Data Management list.
  - [x] Data Management detail.
  - [x] Request approval.
  - [x] Validation request detail.
  - [x] Master data.
  - [x] Trash.
  - [x] Maps/topology/as-built.
  - [x] QR browser fallback.
  - [x] Syntrix-One app detail/validation/history.
- [x] Catat field raw ID yang user-facing:
  - [x] `region_id`
  - [x] `pop_id`
  - [x] `tenant_id`
  - [x] `device_type_id`
  - [x] `brand_id`
  - [x] `model_id`
  - [x] `manufacturer_id`
  - [x] `service_type_id`
  - [x] `project_id`
  - [x] `customer_id`
- [x] Tentukan fallback copy:
  - [x] Loading.
  - [x] Missing.
  - [x] Optional empty.
  - [x] Access denied.
- [x] Tambahkan dokumen rule UI: user-facing field tidak boleh fallback ke UUID.

### Checker

- [x] Search code untuk `|| valueOf(item.*_id`.
- [x] Search code untuk `value={item.*_id}` di component display.
- [x] List semua temuan dalam dokumen UAT.
- [x] Tambahkan script `npm run audit:relation-display`.

### Output Phase 1

- Audit script: `scripts/audit-relation-display.mjs`
- Audit report: `docs/frontend-relation-display-phase-1-audit.md`

## Phase 2 - Backend Enriched Device Core

Tujuan: endpoint device detail/list sudah mengembalikan relasi ringkas.

### Backend Todo

- [x] Review query `GET /api/v1/devices/:id`.
- [x] Tambahkan relasi ringkas:
  - [x] Region.
  - [x] POP.
  - [x] Tenant.
  - [x] Device type.
  - [x] Manufacturer.
  - [x] Brand.
  - [x] Model.
  - [ ] ODP type.
  - [ ] Installation type.
  - [ ] Splitter profile.
- [x] Review `GET /api/v1/devices` untuk list card/table.
- [x] Tambahkan relation enrichment otomatis untuk list dan detail device.
- [x] Pastikan role adminregion tetap memakai where clause region existing sebelum enrichment.
- [x] Hindari select semua kolom.
- [x] Tambahkan syntax verification backend.

### Frontend Todo

- [x] Update typing API device.
- [x] Gunakan relation object dari backend sebagai sumber label utama di detail device.
- [x] Jangan hapus lazy endpoint untuk attachment/ports/history.

### Checker

- [ ] Buka detail ODP dan region tidak pernah tampil sebagai UUID.
- [ ] Buka detail ODP dan POP tidak pernah tampil sebagai UUID.
- [x] Network tab: detail core tidak memicu request terpisah hanya untuk region/POP jika data sudah enriched.
- [x] Payload detail tetap ringkas karena relasi memakai object ringkas.
- [x] Backend `node --check src/shared/resource.service.js` pass.
- [x] Backend `npm test` pass.

### Output Phase 2

- Backend enrichment: `syntrix_backend/src/shared/resource.service.js`
- Endpoint terdampak:
  - `GET /api/v1/devices`
  - `GET /api/v1/devices/:id`
  - `POST /api/v1/devices`
  - `PATCH /api/v1/devices/:id`
- Relasi display-ready yang sudah tersedia jika tabel terkait ada:
  - `region`
  - `pop`
  - `project`
  - `customer`
  - `tenant`
  - `manufacturer`
  - `brand`
  - `model`
  - `device_type`

## Phase 3 - Reference Data Batch Endpoint

Tujuan: frontend punya cara cepat mengambil master/reference data tanpa N+1 request.

### Backend Todo

- [x] Buat endpoint `GET /api/v1/reference-data`.
- [x] Support `groups`.
- [x] Support `region_id` untuk filter POP/customer/project jika perlu.
- [x] Role-aware filter:
  - [x] Superadmin bisa all region.
  - [x] Adminregion sesuai scope.
  - [x] Validator sesuai scope.
- [ ] Tambahkan cache TTL pendek per serverless instance.
- [x] Tambahkan endpoint recap docs.

### Frontend Todo

- [x] Buat API client helper `getReferenceData`.
- [ ] Buat `useReferenceData`.
- [ ] Tambahkan cache stale time.
- [ ] Invalidate cache setelah master data berubah.

### Checker

- [ ] Perpindahan halaman list/detail memakai cache.
- [x] Endpoint batch tersedia untuk mengurangi request kecil ke `/regions/:id`, `/pops/:id`, `/tenants/:id`.
- [x] Adminregion tidak melihat reference data region lain jika tidak diizinkan oleh backend scope.

### Output Phase 3

- Backend endpoint: `GET /api/v1/reference-data`
- Backend implementation: `syntrix_backend/src/modules/resource/resource.routes.js`
- Backend docs: `syntrix_backend/docs/backend-endpoint-recap.md`
- Frontend helper: `syntrix_frontend/lib/api.ts`
- Default groups: `regions`, `pops`, `tenants`, `deviceTypes`, `brands`, `models`, `manufacturers`
- Supported groups: `regions`, `pops`, `tenants`, `deviceTypes`, `brands`, `models`, `assetModels`, `manufacturers`, `projects`, `customers`, `serviceTypes`, `odpTypes`, `installationTypes`, `splitterProfiles`

## Phase 3A - TanStack Query Foundation

Tujuan: frontend punya layer fetch/cache standar sebelum migrasi route besar.

### Frontend Todo

- [x] Install `@tanstack/react-query`.
- [x] Buat `components/providers/query-provider.tsx`.
- [x] Pasang provider di root layout app.
- [x] Tentukan default query config:
  - [x] `staleTime`.
  - [x] `gcTime`.
  - [x] `retry`.
  - [x] `refetchOnWindowFocus`.
- [x] Buat query key factory sederhana:
  - [x] `referenceDataKeys`.
  - [x] `deviceKeys`.
  - [x] `requestKeys`.
  - [x] `historyKeys`.
  - [x] `masterDataKeys`.
- [x] Buat hook awal:
  - [x] `useReferenceData`.
  - [x] `useDeviceDetail`.
  - [x] `useDeviceList`.
- [x] Tambahkan mutation invalidation pattern.
- [x] Dokumentasikan rule query key dan invalidation.

### Checker

- [x] QueryClient hanya dibuat satu kali.
- [ ] Navigasi detail-list-detail memakai cache hit.
- [ ] Tidak ada duplicate fetch untuk reference data yang sama.
- [x] Mutation device meng-invalidate detail dan list.
- [x] Mutation master data meng-invalidate reference data.
- [x] Build/lint pass.

### Output Phase 3A

- Dependency: `@tanstack/react-query`
- Provider: `components/providers/query-provider.tsx`
- Query keys: `lib/query-keys.ts`
- Invalidation helpers: `lib/query-invalidation.ts`
- Reference hook: `hooks/use-reference-data.ts`
- Device hooks: `hooks/use-device-data.ts`

## Phase 4 - Relation Label Resolver

Tujuan: komponen UI tidak lagi mengurus fallback relasi sendiri-sendiri.

### Frontend Todo

- [x] Buat `lib/relation-labels.ts`.
- [x] Implement resolver:
  - [x] Region label.
  - [x] POP label.
  - [x] Tenant label.
  - [x] Device type label.
  - [x] Brand label.
  - [x] Model label.
  - [x] Manufacturer label.
  - [x] Customer label/CID.
  - [x] Project label.
- [x] Implement fallback anti UUID.
- [x] Tambahkan helper `isUuidLike`.
- [x] Migrasi display awal:
  - [x] `DeviceOperationalSummary` untuk Region, POP, dan Type.
  - [x] Detail QR label download untuk POP.
  - [x] Customer detail display untuk Region, POP, dan Project.
  - [x] ODP validation history untuk POP.
- [x] Tambahkan manual verification lewat targeted ESLint dan audit relation display.

### Checker

- [x] Resolver tidak pernah mengembalikan UUID untuk UI label.
- [x] Missing relation tampil `Data tidak tersedia`.
- [x] Optional relation kosong tampil `-`.

### Output Phase 4

- Resolver: `lib/relation-labels.ts`
- Fallback standar:
  - Loading: `Memuat...`
  - Missing/unknown: `Data tidak tersedia`
  - Optional empty: `-`
  - Access denied: `Tidak tersedia untuk scope akun ini`
- Target migrasi awal: detail device operational summary, QR label download, customer detail relation display, dan ODP validation history.
- Catatan audit: `npm run audit:relation-display` masih mendeteksi ID yang memang dipakai sebagai form value/internal fetch key. Temuan UI-display yang tersisa akan dipindahkan bertahap di Phase 5 adapter.

## Phase 5 - Display Adapter Per Domain

Tujuan: setiap halaman membaca data display-ready.

### Frontend Todo

- [x] Buat `device-display-adapter`.
- [ ] Buat `request-display-adapter`.
- [ ] Buat `validation-history-display-adapter`.
- [ ] Buat `qr-fallback-display-adapter`.
- [x] Migrasi sebagian component detail ODP ke adapter.
- [ ] Migrasi device list table/mobile card ke adapter.
- [ ] Migrasi request approval card/detail ke adapter.

### Output Phase 5 - Partial

- Device adapter awal: `lib/display-adapters/device-display-adapter.ts`
- Adapter sudah dipakai untuk:
  - Device operational summary.
  - Customer detail relation display.
  - QR label relation display.
- Scope berikutnya:
  - Pisahkan ID internal untuk form/fetch dari label display dalam audit.
  - Tambahkan adapter request approval.
  - Tambahkan adapter validation history.
  - Migrasi list table/mobile card.

### Checker

- [ ] Detail ODP tidak membaca `item.region_id` langsung untuk display.
- [ ] Request approval tidak membaca raw submitter/device/region ID untuk display.
- [ ] List mobile card tidak menampilkan ID relasi.

## Phase 6 - Skeleton dan Loading Boundary

Tujuan: UX tetap stabil saat data relasi belum siap.

### Frontend Todo

- [ ] Buat skeleton kecil untuk relation field.
- [ ] Terapkan di:
  - [ ] Device detail identity.
  - [ ] Relasi & Vendor.
  - [ ] Request card.
  - [ ] Request comparison.
  - [ ] QR browser fallback.
- [ ] Pastikan tinggi section stabil.
- [ ] Hindari layout shift pada card/table.

### Checker

- [ ] Tidak ada layout flash saat membuka detail ODP.
- [ ] Tidak ada ID berubah menjadi label setelah beberapa detik.
- [ ] Skeleton punya ukuran stabil.

## Phase 7 - Apply ke Semua Route Utama

Tujuan: pola baru berlaku di seluruh frontend.

### Route Todo

- [ ] `/data-management`
- [ ] `/data-management/list/[slug]`
- [ ] `/data-management/list/[slug]/[id]`
- [ ] `/data-management/create`
- [ ] `/requests`
- [ ] `/validation-requests`
- [ ] `/master-data`
- [ ] `/trash`
- [ ] `/maps`
- [ ] `/field/odp/[id]`
- [ ] `/field/access-denied`

### Checker

- [ ] Audit visual desktop.
- [ ] Audit visual mobile.
- [ ] Search raw ID fallback.
- [ ] Build/lint pass.

## Phase 8 - Syntrix-One App Alignment

Tujuan: aplikasi mobile memakai label relasi yang sama, tanpa ID flash.

### App Todo

- [ ] Update API typing device enriched.
- [ ] Update ODP detail view.
- [ ] Update asset browser.
- [ ] Update validation form target info.
- [ ] Update validation history.
- [ ] Update QR mismatch/context screen.
- [ ] Tambahkan mobile loading boundary jika relation data belum siap.

### Checker

- [ ] Scan QR masuk form tanpa ID flash.
- [ ] Detail ODP app tidak tampil UUID region/POP.
- [ ] History app menampilkan nama validator/adminregion jika tersedia.
- [ ] Build Android pass.

## Phase 9 - Performance dan Vercel/Nhost Review

Tujuan: memastikan solusi tidak berat untuk hosting dan database.

### Todo

- [ ] Bandingkan request count sebelum/sesudah di detail ODP.
- [ ] Bandingkan response size sebelum/sesudah.
- [ ] Review cold start behavior.
- [ ] Review Nhost query count.
- [ ] Review TanStack Query cache hit saat navigasi route utama.
- [ ] Review duplicate fetch di React Strict Mode/local dev.
- [ ] Tambahkan backend TTL cache untuk reference data jika aman.
- [ ] Pastikan attachment tetap lazy.
- [ ] Pastikan no over-fetch di list besar.

### Checker

- [ ] Detail ODP core load maksimal 1-2 request utama.
- [ ] Gallery/ports/history tetap lazy.
- [ ] Tidak ada endpoint list yang mengambil attachment besar.
- [ ] Adminregion scope tetap aman.
- [ ] Query cache hit terlihat saat kembali ke route sebelumnya.
- [ ] Invalidation berjalan setelah mutation.

## Phase 10 - Guardrail dan Regression Checker

Tujuan: mencegah pola lama muncul lagi.

### Todo

- [ ] Buat script checker untuk raw relation ID fallback.
- [ ] Tambahkan ke `npm run check:consistency`.
- [ ] Tambahkan dokumentasi developer.
- [ ] Tambahkan contoh benar/salah.
- [ ] Tambahkan checklist review PR/manual.

### Checker

- [ ] Checker gagal jika ada user-facing fallback ke `region_id`.
- [ ] Checker gagal jika ada user-facing fallback ke `pop_id`.
- [ ] Checker mengecualikan field teknis yang memang labelnya `ID`.

## Acceptance Criteria Global

- [ ] User tidak pernah melihat UUID/ID relasi mentah pada field user-facing.
- [ ] Detail ODP tidak mengalami flash dari ID ke label.
- [ ] Request approval tidak mengalami flash dari ID ke nama.
- [ ] List/table/mobile card tidak menampilkan ID relasi.
- [ ] QR browser fallback menampilkan type device dan nama device/tenant/region yang aman.
- [ ] Syntrix-One app tidak menampilkan ID region/POP saat scan/detail/history.
- [ ] Request count saat buka detail berkurang atau minimal tidak bertambah.
- [ ] Navigasi kembali ke list/detail memakai cache dan tidak terasa reset total.
- [ ] TanStack Query invalidation terbukti setelah create/edit/delete/approval.
- [ ] Payload backend tetap ringkas.
- [ ] Vercel serverless tetap aman dari N+1 browser-driven request.
- [ ] Nhost query tetap scoped dan tidak over-fetch.
- [ ] Semua route utama lolos lint/build.

## Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Backend response membesar | Detail/list lebih lambat | Enrich hanya relasi ringkas, data berat tetap lazy |
| Query backend kompleks | Vercel serverless lambat/cold start terasa | Gunakan helper query, index database, TTL cache reference |
| Role leakage | Adminregion melihat region lain | Role-aware filter di backend, jangan filter sensitif di frontend saja |
| Cache stale | Label master lama tampil sementara | Stale time pendek, invalidate setelah create/edit/delete |
| Refactor terlalu besar | Regression workflow | Terapkan bertahap per phase dan route |
| Attachment ikut over-fetch | Storage lambat dan mahal | Attachment tetap endpoint lazy |

## Initial Implementation Priority

Urutan paling aman:

1. Audit raw ID fallback.
2. Backend enriched `GET /devices/:id`.
3. Reference data batch endpoint.
4. TanStack Query foundation.
5. Frontend relation resolver.
6. Migrasi detail ODP.
7. Migrasi list/request/history.
8. Syntrix-One alignment.
9. Guardrail checker.

## Notes

- Jangan menghapus ID dari data model. ID tetap dibutuhkan untuk update, submit, relation, dan audit.
- Yang dilarang adalah menampilkan ID mentah sebagai label user-facing.
- Field teknis seperti `Inventory ID`, `Request ID`, `Device ID`, atau `CID` tetap boleh tampil jika memang itu data bisnis yang dimengerti user.
