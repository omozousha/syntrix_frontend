# Frontend Scalable Architecture Refactor Plan

## Tujuan

Merapihkan struktur Syntrix Frontend agar lebih scalable, mudah dirawat, dan konsisten dengan prinsip `redesign-existing-projects` tanpa merusak workflow produksi.

Fokus utama refactor ini bukan mengubah fitur, melainkan memecah halaman besar menjadi komponen domain yang jelas, memperkuat reusable operational UI pattern, dan membuat halaman penting lebih aman dikembangkan untuk fase berikutnya.

## Latar Belakang

Beberapa halaman utama sudah terlalu besar dan mulai menjadi pusat semua logic, UI, mapping data, state, dan action handler.

File terbesar saat audit:

- `app/(app)/data-management/list/[slug]/[id]/page.tsx` sekitar 3600+ baris.
- `app/(app)/data-management/create/page.tsx` sekitar 2500+ baris.
- `app/(app)/data-management/list/[slug]/page.tsx` sekitar 2500+ baris.
- `app/(app)/validation-requests/page.tsx` sekitar 1800+ baris.
- `app/(app)/data-management/page.tsx` sekitar 1200+ baris.

Kondisi ini masih bisa berjalan, tetapi makin berisiko saat fitur Syntrix bertambah, seperti tenant, QR label, request approval, evidence preview, reminder validation, dan actor enrichment.

## Prinsip Refactor

- Tetap gunakan Next App Router.
- Tetap gunakan shadcn UI sebagai component library utama.
- Jangan mengubah URL structure.
- Jangan mengubah primary nav label.
- Jangan mengubah nama field form tanpa approval.
- Jangan mengubah kontrak API tanpa kebutuhan yang jelas.
- Jangan melakukan rewrite besar dalam satu patch.
- Page file idealnya menjadi composer, bukan tempat semua logic.
- Komponen domain boleh besar saat awal dipindahkan, lalu dipecah lagi setelah aman.
- Refactor harus bisa diverifikasi per fase.
- Setiap fase harus menjaga role superadmin, adminregion, director, owner, dan validator redirect.

## Target Struktur Folder

Struktur yang disarankan:

```txt
components/
  ui/
  shell/
    app-shell.tsx
    app-sidebar.tsx
    nav-user.tsx
    sidebar-smart-tip.tsx
  shared/
    empty-state.tsx
    error-state.tsx
    loading-state.tsx
    page-header.tsx
    section-header.tsx
    response-dialog.tsx
    simple-table.tsx
    status-badge.tsx
  features/
    dashboard/
    data-management/
      asset-overview/
      device-detail/
      device-form/
      device-list/
      master-data/
      qr-label/
    requests/
      request-card.tsx
      request-comparison.tsx
      evidence-preview.tsx
      approval-actions.tsx
    account-management/
    notifications/

lib/
  api/
    client.ts
    devices.ts
    requests.ts
    tenants.ts
    users.ts
  domain/
    device-labels.ts
    device-status.ts
    qr-utils.ts
    request-status.ts
    validation-status.ts
  format/
    date.ts
    number.ts
    text.ts
```

Catatan: struktur ini dapat dibuat bertahap. Tidak semua folder harus dibuat sekaligus.

## Phase 0 - Baseline dan Safety Net

### Tujuan

Membuat baseline sebelum refactor agar setiap perubahan bisa dibandingkan dan diverifikasi.

### Todo

- [x] Catat file terbesar dan dependency utamanya.
- [x] Catat route yang tidak boleh berubah.
- [x] Catat primary nav label yang tidak boleh berubah.
- [x] Catat field form penting yang tidak boleh berubah.
- [x] Catat role behavior untuk superadmin dan adminregion.
- [x] Jalankan baseline command sebelum refactor.
- [x] Simpan hasil audit singkat di execution log jika diperlukan.

### Checker

- [x] `npm run lint`
- [x] `npm run build`
- [x] `git diff --check`
- [ ] Manual open:
  - [ ] `/dashboard`
  - [ ] `/data-management`
  - [ ] `/data-management/create`
  - [ ] `/data-management/list/odp`
  - [ ] `/requests`
  - [ ] `/account-management`
  - [ ] `/master-data`

### Stop Rule

Stop jika baseline build gagal karena perubahan baru. Jangan lanjut ke fase refactor sebelum baseline dipahami.

### Baseline Result - 29 Mei 2026

- `npm run lint` berhasil dengan 1 warning lama:
  - `components/simple-table.tsx`
  - Warning: TanStack Table `useReactTable()` ditandai React Compiler sebagai incompatible library untuk memoization.
  - Status: warning existing, bukan blocker refactor.
- `npm run build` berhasil.
- `git diff --check` berhasil.
- Build routes yang terdeteksi:
  - `/`
  - `/_not-found`
  - `/account-management`
  - `/audit-trail`
  - `/dashboard`
  - `/data-management`
  - `/data-management/as-built`
  - `/data-management/as-built-documents`
  - `/data-management/create`
  - `/data-management/list/[slug]`
  - `/data-management/list/[slug]/[id]`
  - `/data-management/odp-quality`
  - `/data-management/topology`
  - `/field/access-denied`
  - `/field/odp/[id]`
  - `/login`
  - `/maps`
  - `/master-data`
  - `/profile`
  - `/requests`
  - `/trash`
  - `/validation-requests`

### Preservation Baseline

Route yang tidak boleh berubah tanpa approval:

- `/dashboard`
- `/data-management`
- `/data-management/create`
- `/data-management/list/[slug]`
- `/data-management/list/[slug]/[id]`
- `/requests`
- `/validation-requests`
- `/account-management`
- `/master-data`
- `/field/odp/[id]`
- `/login`

Primary navigation label yang harus dipertahankan:

- Dashboard
- Data Management
- Requests
- Audit Trail
- Maps
- As-Built Documents
- Account Management
- Master Data
- Trash

Field form penting yang harus dipertahankan secara kontrak:

- Device identity: device name, old ODP name, new ODP name, inventory ID, device type, status, validation status.
- Location: region, POP, address, longitude, latitude.
- References: tenant, project, manufacturer, brand, model.
- ODP specific: ODP type, installation type, splitter ratio, total ports, port status, customer CID.
- Account: email, full name, role, region, verification status.
- Request review: submitted by, current owner, status, existing value, validator value, adminregion note, superadmin note.

Role behavior yang harus dipertahankan:

- Superadmin dapat melihat dan mengelola lintas region sesuai akses sistem.
- Adminregion hanya fokus pada region terkait.
- Validator web tidak menjadi jalur validasi browser dan diarahkan ke Syntrix-One.
- Director dan owner tidak mendapat action operasional yang tidak sesuai.

## Phase 1 - Shared Operational UI Foundation

### Tujuan

Membuat komponen UI operasional yang konsisten agar halaman besar tidak terus menduplikasi pola visual.

### Komponen Target

- `components/shared/page-header.tsx`
- `components/shared/section-header.tsx`
- `components/shared/status-badge.tsx`
- `components/shared/empty-state.tsx`
- `components/shared/error-state.tsx`
- `components/shared/loading-state.tsx`
- `components/shared/info-field.tsx`
- `components/shared/metric-tile.tsx`
- `components/shared/action-toolbar.tsx`

### Todo

- [x] Buat `PageHeader` untuk title, description, badge role/scope, dan action kanan.
- [x] Buat `SectionHeader` untuk section kecil seperti Summary, Region Cards, Evidence, dan Operations.
- [x] Buat `StatusBadge` yang menerima status request/device/validation.
- [x] Buat `EmptyState` dengan icon, title, description, dan optional action.
- [x] Buat `ErrorState` dengan retry action.
- [x] Buat `LoadingState` untuk page, table, card, dan inline.
- [x] Buat `InfoField` untuk label-value detail device.
- [x] Buat `MetricTile` compact untuk dashboard/detail.
- [x] Buat `ActionToolbar` untuk primary/secondary action yang tidak saling berebut.

### Checker

- [x] Komponen tidak membawa data fetching.
- [x] Komponen tidak punya business logic role.
- [x] Semua props minimal dan mudah dibaca.
- [x] Tidak ada nested card yang tidak perlu.
- [x] Visual mengikuti token global dan shadcn UI.
- [x] `npm run lint`
- [x] `npm run build`

### Risiko

Risiko rendah. Ini mostly additive.

### Phase 1 Result - 29 Mei 2026

Komponen shared additive sudah dibuat di `components/shared/`:

- `action-toolbar.tsx`
- `empty-state.tsx`
- `error-state.tsx`
- `info-field.tsx`
- `loading-state.tsx`
- `metric-tile.tsx`
- `page-header.tsx`
- `section-header.tsx`
- `status-badge.tsx`
- `index.ts`

Catatan:

- Komponen belum dipasang ke halaman besar. Ini disengaja agar Phase 1 tetap rendah risiko.
- `npm run lint` berhasil dengan warning lama TanStack Table di `components/simple-table.tsx`.
- `npm run build` berhasil.
- `git diff --check` berhasil.

## Phase 2 - Shell, Header, Sidebar, dan Nav User

### Tujuan

Merapihkan area shell agar layout dan navigation tidak tersebar.

### Target File

- `components/app-shell.tsx`
- `components/app-sidebar.tsx`
- `components/nav-user.tsx`
- `components/sidebar-smart-tip.tsx`
- target baru di `components/shell/`

### Todo

- [x] Pindahkan shell-related components ke `components/shell/`.
- [x] Pastikan import lama tetap aman atau update import secara bertahap.
- [x] Rapihkan `NavUser` agar avatar, role, region, dan action tidak bercampur dengan state lain.
- [x] Pastikan header compact tetap konsisten di superadmin dan adminregion.
- [x] Pastikan active navigation jelas.
- [x] Pastikan sidebar group tetap sesuai: Workspace, Assets, Validation, Network, Administration.
- [x] Pastikan validator web policy tetap redirect atau block sesuai aturan.

### Checker

- [x] Login superadmin, buka dashboard, cek sidebar/header.
- [x] Login adminregion, cek scope region dan menu yang tampil.
- [x] Cek collapsed/sidebar mobile jika tersedia.
- [x] Tidak ada nav label berubah.
- [x] `npm run lint`
- [x] `npm run build`

### Stop Rule

Stop jika role menu berubah tanpa sengaja.

### Phase 2 Result - 29 Mei 2026

Shell component sekarang punya canonical path di `components/shell/`:

- `app-shell.tsx`
- `app-sidebar.tsx`
- `nav-user.tsx`
- `sidebar-smart-tip.tsx`
- `index.ts`

Catatan:

- File root lama di `components/app-shell.tsx`, `components/app-sidebar.tsx`, `components/nav-user.tsx`, dan `components/sidebar-smart-tip.tsx` dijadikan wrapper re-export agar import lama tetap aman.
- `protected-layout-client.tsx` sudah memakai import baru dari `@/components/shell`.
- `NavUser` mulai dipisah dengan `NavUserAccountMenu` agar area avatar/profile/theme/logout tidak bercampur langsung dengan queue notification.
- Header, sidebar group, active navigation, dan role menu tidak diubah secara behavior.
- `npm run lint` berhasil dengan warning lama TanStack Table di `components/simple-table.tsx`.
- `npm run build` berhasil.
- `git diff --check` berhasil.

## Phase 3 - Generic Device Detail Decomposition

### Tujuan

Memecah file detail device terbesar dengan pola generic-device-first agar workflow QR, tenant, validation status, gallery, reminder, port, dan approval history bisa dikembangkan aman untuk banyak tipe device.

ODP tidak menjadi pusat desain. ODP, ONT, cable, POP, route, dan device type baru dari Master Data harus tetap aman melalui fallback generic section.

### Target File

- `app/(app)/data-management/list/[slug]/[id]/page.tsx`

### Struktur Target

```txt
components/features/data-management/device-detail/
  device-detail-header.tsx
  device-summary-card.tsx
  device-identity-section.tsx
  device-relation-section.tsx
  device-location-section.tsx
  generic-device-raw-section.tsx
  device-capacity-section.tsx
  odp-port-section.tsx
  type-sections/
    odp-port-section.tsx
    ont-customer-section.tsx
    route-path-section.tsx
    cable-section.tsx
    pop-network-section.tsx
  device-qr-section.tsx
  device-operations-section.tsx
  device-gallery-section.tsx
  validation-history-section.tsx
  validation-reminder-dialog.tsx
```

### Todo

- [x] Buat folder `components/features/data-management/device-detail`.
- [x] Pindahkan pure display section dulu, tanpa mengubah logic.
- [x] Pecah header detail: device name, inventory ID, type, region, POP, validation status.
- [x] Buat fallback generic untuk resource/device type yang belum punya UI khusus.
- [x] Pecah official gallery section agar bisa dipakai lintas device.
- [x] Pecah identity fields: Nama ODP Lama, Nama ODP Baru, tenant, type, installation, status.
- [x] Pecah relation fields: region, POP, project, manufacturer, brand.
- [x] Pecah capacity/network fields: management IP, core, total port, used port, splitter.
- [x] Pecah location fields: address, longitude, latitude.
- [x] Pecah ODP port section dan pastikan CID tampil untuk used port.
- [x] Pecah QR label section dan download action.
- [x] Pecah operations section shell.
- [x] Pecah reminder validation action/dialog.
- [x] Pecah gallery resmi device dan pending evidence agar tidak tercampur.
- [x] Pecah validation history.
- [x] Pastikan hasil validasi pending tidak mengubah data utama sebelum approval final.

### Checker

- [x] Detail ODP tampil sama sebelum dan sesudah refactor.
- [x] Detail non-ODP tetap aman melalui fallback generic section.
- [x] Tenant tampil jika ada.
- [x] Installation date tampil jika ada.
- [x] QR download PNG dan bulk format tidak berubah.
- [x] Tombol reminder tetap region-aware.
- [x] Gallery tidak menampilkan pending evidence sebagai official attachment sebelum approval.
- [x] ODP Operations tidak memakai snapshot pending sebagai data final.
- [x] `npm run lint`
- [x] `npm run build`

### Stop Rule

Stop jika detail ODP berubah data behavior, terutama validation status, port, image attachment, atau QR action.

### Phase 3 Progress - 29 Mei 2026

Implementasi awal Phase 3 sudah dilakukan secara generic-device-first:

- Membuat folder `components/features/data-management/device-detail/`.
- Mengekstrak `DeviceDetailHeader`.
- Mengekstrak `DeviceOperationalSummary` untuk semua resource device.
- Mengekstrak `GenericDeviceRawSection` sebagai fallback agar resource/device type yang belum punya section khusus tetap aman.
- Mengekstrak `DeviceGallerySection` untuk official image attachment lintas device.
- Mengekstrak `DeviceDetailForm` menjadi feature component dengan section internal identity, relation/vendor, capacity/network, location, dan tags.
- Mengekstrak presentational validation history helpers: `OdpValidationWorkflowTimeline`, `OdpFieldValidationSummary`, `OdpPortSnapshotSummary`, `OdpInspectionSummary`, dan `formatOdpInspectionSummary`.
- Mengekstrak dan memasang `OdpPortMetrics`.
- Mengekstrak dan memasang `OdpCoreChainSummarySection` dengan draft-link state tetap dikendalikan dari parent `OdpOperationsPanel`.
- Mengekstrak dan memasang `OdpQrActionPanel` untuk QR label, download PNG, dan entry point reminder tanpa memindahkan state/action parent.
- Mengekstrak dan memasang `OdpPortSection` untuk list/editor port, relasi customer/ONT, CID, status, redaman terakhir, dan archive port tanpa memindahkan state/action parent.
- Mengekstrak dan memasang `ValidationReminderDialog` untuk pemilihan validator region dan submit reminder tanpa memindahkan state/action parent.
- Mengekstrak dan memasang `OdpOperationsShell` untuk card, collapsible, dan action header ODP Operations.
- Mendesain ulang `DeviceGallerySection` sebagai galeri resmi device dan menambahkan `ValidationEvidenceAction` agar evidence validasi tampil terpisah dari attachment resmi.
- Mengekstrak dan memasang `OdpValidationHistorySection` untuk timeline workflow, reject note, actor validator, ringkasan hasil validasi, port snapshot, checklist, dan action evidence.
- `app/(app)/data-management/list/[slug]/[id]/page.tsx` masih menjadi composer utama agar behavior ODP Operations, QR label, reminder, port, dan validation history tidak berubah mendadak.
- `npm run lint` berhasil dengan warning lama TanStack Table di `components/simple-table.tsx`.
- `npm run build` berhasil.
- `git diff --check` berhasil.
- Verifikasi lanjutan setelah ekstraksi `DeviceDetailForm`: `npm run lint`, `npm run build`, dan `git diff --check` berhasil. Warning lint tetap warning lama TanStack Table.
- Verifikasi lanjutan setelah ekstraksi helper history validasi ODP: `npm run lint`, `npm run build`, dan `git diff --check` berhasil. Warning lint tetap warning lama TanStack Table.
- Verifikasi lanjutan setelah pemasangan `OdpPortMetrics`: `npm run lint`, `npm run build`, dan `git diff --check` berhasil. Warning lint tetap warning lama TanStack Table.
- Verifikasi lanjutan setelah pemasangan `OdpCoreChainSummarySection`: `npm run lint`, `npm run build`, dan `git diff --check` berhasil. Warning lint tetap warning lama TanStack Table.
- Verifikasi lanjutan setelah pemasangan `OdpQrActionPanel`: `npm run lint`, `npm run build`, dan `git diff --check` berhasil. Warning lint tetap warning lama TanStack Table.
- Verifikasi lanjutan setelah pemasangan `OdpPortSection`: `npm run lint`, `npm run build`, dan `git diff --check` berhasil. Warning lint tetap warning lama TanStack Table.
- Verifikasi lanjutan setelah pemasangan `ValidationReminderDialog`: `npm run lint`, `npm run build`, dan `git diff --check` berhasil. Warning lint tetap warning lama TanStack Table.
- Verifikasi lanjutan setelah pemasangan `OdpOperationsShell`: `npm run lint`, `npm run build`, dan `git diff --check` berhasil. Warning lint tetap warning lama TanStack Table.
- Verifikasi lanjutan setelah pemisahan galeri resmi dan evidence validasi: `npm run lint`, `npm run build`, dan `git diff --check` berhasil. Warning lint tetap warning lama TanStack Table.
- Verifikasi lanjutan setelah pemasangan `OdpValidationHistorySection`: `npm run lint`, `npm run build`, dan `git diff --check` berhasil. Warning lint tetap warning lama TanStack Table.
- Checker behavior Phase 3:
  - Data utama ODP tetap dari `item` dan `latestApprovedOdpValidation`, bukan snapshot pending.
  - Gallery resmi tetap dari `item.image_attachments`; evidence validasi tetap berada di histori validasi.
  - ODP Operations port snapshot memakai `isFinalValidationRecord`, sehingga pending request tidak menjadi data final.
  - Tenant dan installation date sudah tampil melalui `DeviceDetailForm` dan `DeviceOperationalSummary`.

Sisa Phase 3:

- Jalankan checker behavior untuk memastikan pending validation tidak mengubah data utama sebelum approval final.

## Phase 4 - Data Management Create Form Decomposition

### Tujuan

Memecah create form agar device category baru, tenant, POP, customer, route, project, dan ODP/ONT logic tidak saling mengganggu.

### Target File

- `app/(app)/data-management/create/page.tsx`

### Struktur Target

```txt
components/features/data-management/device-form/
  create-data-page.tsx
  create-form-chrome.tsx
  create-form-status-alerts.tsx
  create-operational-fields.tsx
  create-kind-selector.tsx
  device-create-form.tsx
  device-hardware-fields.tsx
  device-capacity-fields.tsx
  create-location-fields.tsx
  pop-create-form.tsx
  customer-create-form.tsx
  route-create-form.tsx
  project-create-form.tsx
  form-field-grid.tsx
  media-attachment-fields.tsx
  form-reference-selects.tsx
  create-submit-dialog.tsx
```

### Todo

- [x] Pindahkan field reusable ke `form-field-grid`.
- [x] Pindahkan header create page dan header card form ke `create-form-chrome`.
- [x] Pindahkan global error/success alert create ke `create-form-status-alerts`.
- [x] Mulai pisahkan form per kind dengan `project-create-form`.
- [x] Pisahkan field utama route ke `route-create-form`.
- [x] Pisahkan field identity dan operasional POP ke `pop-create-form`.
- [x] Pisahkan field utama customer dan reference select ke `customer-create-form`.
- [x] Mulai pisahkan field dasar device ke `device-create-form`.
- [x] Pisahkan attachment image/support document ke `media-attachment-fields`.
- [x] Pisahkan status, installation date, dan validation fields ke `create-operational-fields`.
- [x] Pisahkan manufacturer, brand, model, dan serial number ke `device-hardware-fields`.
- [x] Pisahkan capacity core, port, dan splitter fields ke `device-capacity-fields`.
- [x] Pisahkan address, province, city, longitude, dan latitude ke `create-location-fields`.
- [x] Pisahkan form per kind.
- [x] Pastikan tenant field ada di create device.
- [x] Pastikan tenant field ada di edit device jika edit berada di detail.
- [x] Pastikan dynamic device category tetap membaca config, bukan hardcoded.
- [x] Pastikan customer reference di ONT tetap filter sesuai POP terkait.
- [x] Pastikan validation dialog untuk required field tetap ada.
- [x] Pastikan superadmin dan adminregion field visibility tetap sesuai.

### Checker

- [x] Create POP.
- [x] Create ODP dengan tenant.
- [x] Create ODC/OLT jika tersedia.
- [x] Create ONT dengan customer reference sesuai POP.
- [x] Create customer.
- [x] Create route.
- [x] Create project.
- [x] Error required field muncul via dialog.
- [x] `npm run lint`
- [x] `npm run build`

### Stop Rule

Stop jika payload create device berubah tanpa sengaja.

### Phase 4 Progress - 2 Juni 2026

- Membuat folder `components/features/data-management/device-form/`.
- Mengekstrak field reusable ke `form-field-grid.tsx`: `Field`, `FieldLabel`, `CidField`, `CoordinateField`, dan `AutoFilledBadge`.
- Mengekstrak chrome presentasional create form ke `create-form-chrome.tsx`: header halaman, title form, deskripsi form, dan tombol kembali.
- Mengekstrak alert global create form ke `create-form-status-alerts.tsx` agar feedback submit tidak bercampur dengan body field.
- Mengekstrak field utama project ke `project-create-form.tsx`; attachment project masih inline karena berbagi helper preview/upload.
- Mengekstrak field utama route ke `route-create-form.tsx`; pilihan route type, POP, dan project tetap memakai data master dari page.
- Mengekstrak field identity dan operasional POP ke `pop-create-form.tsx`; attachment POP dan support document masih inline karena berbagi helper preview/upload.
- Mengekstrak field utama customer ke `customer-create-form.tsx`; region, status, dan lokasi tetap inline karena dipakai lintas kind.
- Mengekstrak field dasar device ke `device-create-form.tsx`: nama device/ODP, tipe ODP, jenis instalasi, POP, dan tenant. ONT customer auto-fill masih inline karena mengubah lokasi dan status.
- Mengekstrak field attachment image dan support document ke `media-attachment-fields.tsx`; state file dan upload submit tetap berada di page.
- Mengekstrak status, installation date, validation status, dan validation date ke `create-operational-fields.tsx`.
- Mengekstrak approval notice dan create response dialog ke `create-submit-dialog.tsx`.
- Mengekstrak manufacturer, brand, model, dan serial number perangkat ke `device-hardware-fields.tsx`.
- Mengekstrak capacity core, used core, total port, used port, dan splitter ratio ke `device-capacity-fields.tsx`.
- Mengekstrak address, province, city, longitude, dan latitude ke `create-location-fields.tsx`.
- Required-field error sekarang memakai dialog response untuk semua create kind: POP, Route, Project, Customer, ODP/ONT, dan device generic.
- Visibility region superadmin/adminregion tetap mengikuti logic existing: superadmin memilih region, adminregion terkunci pada scope region akun.
- Submit payload create belum diubah; validasi submit yang membutuhkan shape `{ valid, state, message }` tetap berada di page.
- Verifikasi setelah ekstraksi field reusable: `npm run lint`, `npm run build`, dan `git diff --check` berhasil. Warning lint tetap warning lama TanStack Table.
- Verifikasi setelah ekstraksi `create-form-chrome` dan `create-form-status-alerts`: `npm run lint`, `npm run build`, dan `git diff --check` berhasil. Warning lint tetap warning lama TanStack Table.
- Verifikasi setelah ekstraksi `ProjectCreateForm`: `npm run lint`, `npm run build`, dan `git diff --check` berhasil. Warning lint tetap warning lama TanStack Table.
- Verifikasi setelah ekstraksi `RouteCreateForm`: `npm run lint`, `npm run build`, dan `git diff --check` berhasil. Warning lint tetap warning lama TanStack Table.
- Verifikasi setelah ekstraksi `PopCreateIdentityFields`, `PopCreateOperationalFields`, `CustomerCreateForm`, dan `DeviceCreateForm`: `npm run lint`, `npm run build`, dan `git diff --check` berhasil. Warning lint tetap warning lama TanStack Table.
- Verifikasi setelah ekstraksi `ImageAttachmentField` dan `SupportDocumentField`: `npm run lint`, `npm run build`, dan `git diff --check` berhasil. Warning lint tetap warning lama TanStack Table.
- Verifikasi setelah ekstraksi `CreateOperationalFields`: `npm run lint`, `npm run build`, dan `git diff --check` berhasil. Warning lint tetap warning lama TanStack Table.
- Verifikasi setelah ekstraksi `CreateApprovalDialog` dan `CreateResponseDialog`: `npm run lint`, `npm run build`, dan `git diff --check` berhasil. Warning lint tetap warning lama TanStack Table.
- Verifikasi setelah ekstraksi `DeviceHardwareFields` dan `CreateLocationFields`: `npm run lint`, `npm run build`, dan `git diff --check` berhasil. Warning lint tetap warning lama TanStack Table.
- Verifikasi setelah ekstraksi `DeviceCapacityFields`: `npm run lint`, `npm run build`, dan `git diff --check` berhasil. Warning lint tetap warning lama TanStack Table.
- Checker existing Phase 4:
  - Tenant create device sudah memakai `tenant_id` dari master data Tenant dan masuk payload create device.
  - Tenant edit device sudah tersedia di `DeviceDetailForm`.
  - Dynamic device category tetap memakai `deviceTypeKeyToSlug` dan `form.device_type_key` dari query/type.
  - Customer reference ONT sudah difilter berdasarkan `form.pop_id`.

## Phase 5 - Data Management List Decomposition

### Tujuan

Membuat list asset lebih mudah dikembangkan untuk kategori baru dan filter dinamis.

### Target File

- `app/(app)/data-management/list/[slug]/page.tsx`

### Struktur Target

```txt
components/features/data-management/device-list/
  data-list-page.tsx
  data-list-header.tsx
  data-list-kpi-strip.tsx
  data-list-filter-bar.tsx
  data-table-view.tsx
  data-mobile-list.tsx
  data-empty-state.tsx
  data-bulk-actions.tsx
```

### Todo

- [x] Pisahkan header list.
- [x] Pisahkan KPI strip list.
- [x] Pisahkan search/filter/status/pop filter.
- [ ] Pisahkan table desktop.
- [ ] Pisahkan mobile card/list.
- [x] Pisahkan bulk QR/action bar.
- [ ] Pastikan filter POP untuk kategori relevan tetap ada.
- [ ] Pastikan category baru tidak menyebabkan crash.
- [ ] Pastikan customer menampilkan CID, bukan internal id.

### Checker

- [ ] List ODP.
- [ ] List ODC/OLT/ONT.
- [ ] List CUSTOMER.
- [ ] List POP.
- [ ] List route/project/pole jika tersedia.
- [ ] Search tetap jalan.
- [ ] Filter POP tetap jalan.
- [ ] Bulk QR 16 label per lembar tetap jalan.
- [ ] `npm run lint`
- [ ] `npm run build`

### Phase 5 Progress - 2 Juni 2026

- Membuat folder `components/features/data-management/device-list/`.
- Mengekstrak header list ke `data-list-header.tsx`; tombol Add master data dan tombol kembali tetap memakai handler/link existing.
- Mengekstrak KPI strip list ke `data-list-kpi-strip.tsx`; total data, selected item, POP filter, dan access summary tetap memakai nilai existing dari page.
- Mengekstrak search, province filter, POP filter, archive status filter, rows per page, apply, dan reset ke `data-list-filter-bar.tsx`.
- Mengekstrak selected item bar, bulk QR download, restore, activate, deactivate, archive/delete, dan clear selection ke `data-bulk-actions.tsx`.
- Verifikasi setelah ekstraksi header dan KPI strip: `npm run lint`, `npm run build`, dan normalisasi diff line ending berhasil.
- Verifikasi setelah ekstraksi `DataListFilterBar`: `npm run lint`, `npm run build`, dan `git diff --check` berhasil.
- Verifikasi setelah ekstraksi `DataBulkActions`: `npm run lint`, `npm run build`, dan `git diff --check` berhasil.

### Stop Rule

Stop jika list data berubah jumlah/akses karena refactor UI.

## Phase 6 - Validation Requests / Approval Decomposition

### Tujuan

Merapihkan halaman request agar comparison, evidence preview, actor name, dan approval action jelas dan tidak duplikatif.

### Target File

- `app/(app)/validation-requests/page.tsx`
- `app/(app)/requests/page.tsx`

### Struktur Target

```txt
components/features/requests/
  request-page.tsx
  request-list.tsx
  request-card.tsx
  request-status-badge.tsx
  request-actor-line.tsx
  request-comparison.tsx
  evidence-checklist-preview.tsx
  approval-actions.tsx
  request-response-dialog.tsx
```

### Todo

- [ ] Hilangkan informasi actor yang double.
- [ ] Gunakan `Submitted By` sebagai sumber actor submit utama.
- [ ] Tampilkan nama user, bukan id.
- [ ] Pisahkan request card list.
- [ ] Pisahkan comparison existing vs validator.
- [ ] Pastikan Nama ODP Lama dan Nama ODP Baru tampil.
- [ ] Pastikan POP existing menampilkan nama, bukan uuid.
- [ ] Tampilkan preview evidence langsung di card checklist kondisi.
- [ ] Sediakan tombol preview dan download evidence.
- [ ] Pastikan adminregion/superadmin tidak punya tombol open validation.
- [ ] Pastikan approval action tetap role-aware.

### Checker

- [ ] Adminregion melihat request yang butuh review regionnya.
- [ ] Superadmin melihat request sesuai tahap final.
- [ ] Request create asset tetap tampil benar.
- [ ] Request validation asset tampil comparison benar.
- [ ] Evidence preview dan download berjalan.
- [ ] Submitted By tampil nama saja.
- [ ] Tidak ada duplicate actor line.
- [ ] Tidak ada tombol audit/open validation yang tidak relevan.
- [ ] `npm run lint`
- [ ] `npm run build`

### Stop Rule

Stop jika approval state machine berubah atau request action salah role.

## Phase 7 - Asset Overview / Dashboard Modularization

### Tujuan

Membuat dashboard dan asset overview lebih ringan dan modular.

### Target File

- `app/(app)/data-management/page.tsx`
- `app/(app)/dashboard/page.tsx`

### Struktur Target

```txt
components/features/data-management/asset-overview/
  asset-overview-page.tsx
  asset-summary-strip.tsx
  region-card-grid.tsx
  region-card.tsx
  data-quality-panel.tsx
  asset-overview-filter.tsx
```

### Todo

- [ ] Pisahkan summary card.
- [ ] Pisahkan region card grid.
- [ ] Pisahkan data quality panel.
- [ ] Pastikan superadmin melihat semua region.
- [ ] Pastikan adminregion fokus region terkait.
- [ ] Pastikan chart atau summary tidak terlalu fokus ODP saja.
- [ ] Pastikan last update tetap konsisten.

### Checker

- [ ] Asset overview superadmin.
- [ ] Asset overview adminregion.
- [ ] Empty state region.
- [ ] Search region.
- [ ] Tab overview/data quality.
- [ ] `npm run lint`
- [ ] `npm run build`

## Phase 8 - Account Management Modularization

### Tujuan

Memastikan account management aman untuk role superadmin/adminregion, email verification, dan create superadmin.

### Target File

- `app/(app)/account-management/page.tsx`

### Struktur Target

```txt
components/features/account-management/
  account-management-page.tsx
  account-summary-cards.tsx
  account-filter-bar.tsx
  account-table.tsx
  create-account-sheet.tsx
  edit-account-sheet.tsx
  account-danger-dialog.tsx
```

### Todo

- [ ] Pisahkan summary stats.
- [ ] Pisahkan filter role/region/status.
- [ ] Pisahkan table.
- [ ] Pisahkan create account sheet.
- [ ] Pisahkan edit account sheet.
- [ ] Pastikan superadmin bisa create superadmin.
- [ ] Pastikan redirect verification error tetap ResponseDialog.
- [ ] Pastikan data sensitif tidak tampil berlebihan.

### Checker

- [ ] Create validator.
- [ ] Create adminregion.
- [ ] Create superadmin.
- [ ] Resend verification.
- [ ] Edit account.
- [ ] Delete/disable jika tersedia.
- [ ] `npm run lint`
- [ ] `npm run build`

## Phase 9 - API and Domain Layer Cleanup

### Tujuan

Mengurangi logic domain di page/component dan membuat formatter/mapping reusable.

### Target

- `lib/api.ts`
- `lib/data-management-config.ts`
- `lib/validation-status.ts`

### Struktur Target

```txt
lib/api/client.ts
lib/api/devices.ts
lib/api/requests.ts
lib/api/tenants.ts
lib/api/users.ts
lib/domain/device-labels.ts
lib/domain/request-status.ts
lib/domain/validation-status.ts
lib/format/date.ts
lib/format/text.ts
```

### Todo

- [ ] Jangan pecah `lib/api.ts` terlalu cepat jika banyak import masih bergantung.
- [ ] Mulai dari helper domain yang aman: label device, status badge, date format.
- [ ] Pindahkan formatter berulang dari page besar.
- [ ] Pastikan API method name tetap jelas.
- [ ] Jangan mengubah endpoint path.

### Checker

- [ ] Search import lama.
- [ ] Pastikan no circular import.
- [ ] `npm run lint`
- [ ] `npm run build`

### Stop Rule

Stop jika refactor lib API mulai mengubah behavior request.

## Phase 10 - Final Consistency Pass

### Tujuan

Memastikan semua hasil refactor terasa satu sistem dan tidak meninggalkan visual/UX berbeda antar halaman.

### Todo

- [ ] Audit typography scale.
- [ ] Audit spacing antar section.
- [ ] Audit shadow/radius/card usage.
- [ ] Audit status badge.
- [ ] Audit loading/empty/error state.
- [ ] Audit mobile viewport.
- [ ] Audit role superadmin/adminregion.
- [ ] Audit route preservation.
- [ ] Audit field name preservation.
- [ ] Audit no dead action button.

### Checker

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `git diff --check`
- [ ] Manual UAT route utama.
- [ ] Screenshot desktop route utama.
- [ ] Screenshot mobile route utama jika perlu.

## Global Checker Matrix

Gunakan checker berikut setelah setiap phase besar.

### Static Checker

```bash
npm run lint
npm run build
git diff --check
```

### Route Checker

- [ ] `/login`
- [ ] `/dashboard`
- [ ] `/data-management`
- [ ] `/data-management/create`
- [ ] `/data-management/list/odp`
- [ ] `/data-management/list/odp/{id}`
- [ ] `/requests`
- [ ] `/validation-requests`
- [ ] `/account-management`
- [ ] `/master-data`
- [ ] `/field/odp/{id}`

### Role Checker

- [ ] Superadmin dapat melihat semua region.
- [ ] Superadmin dapat create/edit data lintas region.
- [ ] Superadmin dapat review tahap final jika workflow membutuhkan.
- [ ] Adminregion hanya melihat data region terkait.
- [ ] Adminregion hanya menerima dan mengirim reminder region terkait.
- [ ] Validator web tidak dapat mengakses form validasi browser.
- [ ] Validator diarahkan ke Syntrix-One.
- [ ] Director/owner tidak mendapat action operasional yang tidak sesuai.

### Data Behavior Checker

- [ ] Detail device tidak berubah karena refactor display.
- [ ] Pending validation tidak menimpa official device detail.
- [ ] Gallery official tidak bercampur dengan evidence pending.
- [ ] QR label tetap sama formatnya.
- [ ] Tenant tetap tampil di create/edit/detail/QR fallback.
- [ ] Submitted By tampil nama, bukan id.
- [ ] POP tampil nama, bukan uuid.
- [ ] CID tampil sebagai customer reference.

### UI Checker

- [ ] Tidak ada text overlap.
- [ ] Tidak ada nested card tidak perlu.
- [ ] Tidak ada layout shift besar saat loading.
- [ ] Empty state jelas.
- [ ] Error state punya retry jika relevan.
- [ ] Focus ring tetap terlihat.
- [ ] Button punya hover/active state.
- [ ] Mobile tetap readable.

## Definition of Done

Refactor dianggap selesai jika:

- [ ] Semua phase target utama selesai.
- [ ] Page besar utama sudah menjadi composer.
- [ ] Komponen domain bisa digunakan ulang.
- [ ] Tidak ada perubahan URL tanpa approval.
- [ ] Tidak ada perubahan nav label tanpa approval.
- [ ] Tidak ada perubahan field name tanpa approval.
- [ ] Tidak ada perubahan API contract tanpa kebutuhan tertulis.
- [ ] `npm run lint` berhasil.
- [ ] `npm run build` berhasil.
- [ ] `git diff --check` berhasil.
- [ ] UAT superadmin dan adminregion lolos.
- [ ] Validator redirect policy tetap jalan.
- [ ] Update log dan checklist docs diperbarui.

## Execution Strategy

Rekomendasi eksekusi:

1. Kerjakan satu phase per commit.
2. Untuk file besar, pindahkan satu section dulu, verifikasi, lalu lanjut.
3. Hindari mengubah logic dan desain visual besar dalam patch yang sama.
4. Jika perlu mengubah backend/API, buat dokumen mini-plan terpisah sebelum implementasi.
5. Setelah setiap phase, update checklist ini.

## Prioritas Pertama

Prioritas paling aman dan paling berdampak:

1. Phase 1 - Shared Operational UI Foundation.
2. Phase 3 - Device Detail / ODP Detail Decomposition.
3. Phase 6 - Validation Requests / Approval Decomposition.
4. Phase 4 - Data Management Create Form Decomposition.
5. Phase 5 - Data Management List Decomposition.

Alasannya: detail device dan request approval adalah pusat workflow Syntrix sekarang. Jika dua area ini rapi, fitur berikutnya seperti tenant, reminder, evidence, QR, dan approval akan lebih mudah dikembangkan tanpa menambah risiko.
