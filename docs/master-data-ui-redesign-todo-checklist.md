# Master Data UI Redesign Todo Checklist

Tanggal: 8 Juni 2026

## Tujuan

Meredesign halaman **Master Data** agar lebih modern, ringkas, responsif, dan tetap aman untuk workflow yang sudah berjalan, terutama QR label settings, upload logo, footer text, preview label, dan akses role superadmin.

## Prinsip Implementasi

- Pertahankan fungsi existing sebelum polish visual.
- Jangan mengubah endpoint, payload, field name, atau permission tanpa kebutuhan jelas.
- QR label settings tetap hanya untuk superadmin.
- Adminregion tetap dapat melihat hasil QR label terbaru setelah superadmin mengubah setting.
- Gunakan komponen existing/shadcn UI bila tersedia.
- Gunakan Relation-Ready Rendering untuk semua label relasi/master data.
- Hindari layout flash: preview QR label tidak boleh tampil dengan logo sementara sebelum setting selesai dimuat.
- Pastikan mobile tidak terasa sesak.

## Scope Halaman

Target utama:

```txt
syntrix_frontend/app/(app)/master-data/page.tsx
```

Area yang disentuh:

- Header/konteks halaman Master Data.
- KPI/stat summary master data.
- QR label settings.
- Upload logo QR.
- Preview QR label.
- Reference/master data cards.
- Empty state master data.
- Responsive layout desktop dan mobile.
- Top-level tabs:
  - Basis Data Referensi.
  - Konfigurasi Label QR.

## Non-Goals

- Tidak mengubah schema database.
- Tidak mengubah backend endpoint.
- Tidak mengubah akses adminregion/validator.
- Tidak mengubah format final QR label PNG/PDF yang sudah disetujui.
- Tidak mengubah hasil download QR label bulk/detail ODP.

## Phase 1 - Audit Halaman Master Data Saat Ini

Tujuan: memahami struktur halaman dan menjaga fungsi existing sebelum redesign.

### Todo

- [x] Audit struktur `master-data/page.tsx`.
- [x] Identifikasi komponen yang sudah bisa dipecah:
  - QR label settings form.
  - QR label preview.
  - logo upload/crop.
  - stat summary.
  - reference cards/list.
- [x] Catat state yang berhubungan dengan QR label:
  - active logo.
  - footer text.
  - crop/upload dialog.
  - success/error dialog.
  - loading states.
- [x] Pastikan role guard superadmin tetap jelas.
- [x] Cek responsive behavior existing di desktop/tablet/mobile.

### Checker

- [x] Tidak ada perubahan behavior pada phase audit.
- [x] Semua fungsi existing terdaftar sebelum refactor.

## Phase 2 - Layout Redesign

Tujuan: mengganti layout linear panjang menjadi layout responsive yang lebih efisien.

### Desktop Layout

- [x] Buat layout 2 kolom untuk QR label settings:
  - kiri: form footer text, upload logo, action buttons.
  - kanan: sticky preview QR label.
- [x] Pisahkan halaman Master Data menjadi hybrid tabs:
  - Basis Data Referensi sebagai tab default.
  - Konfigurasi Label QR sebagai tab kedua.
- [x] Preview tetap terlihat saat user scroll dalam area settings.
- [x] Pastikan spacing antar section lebih compact dan konsisten.
- [x] Gunakan max-width dan grid responsive yang tidak melebar berlebihan.

### Mobile Layout

- [x] Ubah layout menjadi stacked.
- [x] Buat preview tetap mudah diakses tanpa memakan layar terlalu besar.
- [x] Pilih salah satu pola mobile:
  - tab switcher `Edit` / `Preview`, atau
  - preview collapsible yang default tertutup.
- [x] Tombol action tetap mudah ditekan dengan tinggi minimal 44px.

### Checker

- [x] Desktop tidak perlu scroll panjang hanya untuk melihat preview.
- [x] Mobile tidak horizontal overflow.
- [x] Header/body tidak overlap.
- [x] Preview QR label tidak berubah ukuran secara jarring saat data selesai dimuat.
- [x] QR label settings tidak memakan ruang tab referensi utama.

## Phase 3 - KPI/Stat Summary Redesign

Tujuan: mengganti card besar menjadi stat bar inline yang hemat ruang.

### Todo

- [x] Ubah KPI cards menjadi compact stat bar.
- [x] Gunakan icon monokrom dari lucide.
- [x] Angka utama dibuat jelas dengan tabular numeric.
- [x] Caption dibuat singkat dan operasional.
- [x] Mobile menggunakan horizontal scroll row.
- [x] Pastikan loading state memakai skeleton/stat placeholder, bukan layout kosong.

### Checker

- [x] Semua angka summary existing tetap sama.
- [x] Mobile dapat scroll horizontal dengan nyaman.
- [x] Tidak ada card terlalu tinggi untuk informasi kecil.

## Phase 4 - QR Logo Upload Redesign

Tujuan: mengganti input file bawaan menjadi upload zone modern.

### Todo

- [x] Buat drag-and-drop upload zone.
- [x] Tambahkan ikon upload.
- [x] Tampilkan nama file yang dipilih.
- [x] Tambahkan active drag state.
- [x] Pertahankan validasi file image.
- [x] Pertahankan crop dialog sebelum upload.
- [x] Tambahkan loading indicator saat membaca file/crop/upload.
- [x] Success dialog tetap muncul setelah upload berhasil.
- [x] Reset logo tetap jelas dan tidak membingungkan.

### Checker

- [x] Upload logo masih berhasil.
- [x] Crop masih berjalan sebelum upload.
- [x] Logo aktif berubah di preview setelah upload.
- [x] Footer text tidak hilang saat upload logo.
- [x] Reset logo kembali ke default dengan konfirmasi/result yang jelas.
- [x] Tidak ada native `Choose File` yang terlihat.

## Phase 5 - QR Label Preview Stabil

Tujuan: preview QR label terasa live, akurat, dan bebas layout/data flash.

### Todo

- [x] Preview memakai logo aktif dari QR label settings.
- [x] Preview tidak render default logo sementara saat setting belum selesai dimuat.
- [x] Preview mengikuti perubahan footer text secara stabil.
- [x] Preview menampilkan loading state kecil saat redraw.
- [x] Preview tetap sama dengan hasil download detail ODP dan bulk QR.
- [x] Tambahkan label status:
  - logo aktif.
  - terakhir update.
  - fallback default jika belum ada custom logo.

### Checker

- [x] Tidak ada flash logo sementara.
- [x] Preview sama dengan hasil download.
- [x] Perubahan footer text terlihat sebelum simpan sebagai draft preview, bila desain mendukung.
- [x] Download tetap memakai setting tersimpan.

## Phase 6 - Reference Cards/List Redesign

Tujuan: membuat daftar referensi master data lebih compact dan navigable.

### Todo

- [x] Ubah reference cards menjadi mini data list/table.
- [x] Setiap row clickable ke halaman/list terkait.
- [x] Ganti tombol teks `Open` dengan chevron/action icon.
- [x] Tambahkan count badge untuk setiap item.
- [x] Tambahkan hover state yang halus.
- [x] Buat empty/zero count state:
  - muted text.
  - badge warna warning/neutral.
  - icon kecil bila perlu.
- [x] Kelompokkan referensi dengan heading yang jelas:
  - Lokasi.
  - Perangkat.
  - Vendor/Hardware.
  - Layanan/Project.
  - QR Label Settings.

### Checker

- [x] Semua link navigasi tetap benar.
- [x] Count tetap akurat.
- [x] Zero count mudah dikenali tanpa terlihat error fatal.
- [x] Row clickable bisa diakses keyboard.

## Phase 7 - Design System Polish

Tujuan: memastikan hasil redesign terasa satu keluarga dengan UI Syntrix terbaru.

### Todo

- [x] Gunakan warna dasar Syntrix yang sudah ada.
- [x] Hindari palette satu hue yang terlalu monoton.
- [x] Pastikan contrast text memenuhi kebutuhan operasional.
- [x] Button group untuk:
  - Simpan settings.
  - Upload/ganti logo.
  - Reset logo.
- [x] Gunakan focus ring yang jelas.
- [x] Gunakan radius konsisten dengan sistem saat ini.
- [x] Pastikan typography tidak terlalu besar untuk dashboard/ops page.

### Checker

- [x] Tidak ada text overflow di mobile.
- [x] Tidak ada nested card yang berlebihan.
- [x] Semua tombol punya hover/focus/disabled state.
- [x] Tidak ada decorative orb/gradient berlebihan.

## Phase 8 - Role dan Permission Verification

Tujuan: memastikan redesign tidak membuka akses setting ke role yang salah.

### Todo

- [x] Superadmin bisa:
  - melihat QR label settings.
  - upload/crop logo.
  - edit footer text.
  - reset logo.
  - melihat preview.
- [x] Adminregion tidak bisa mengubah setting.
- [x] Adminregion tetap melihat QR label terbaru di detail ODP/download.
- [x] Validator tidak mendapat akses web Master Data.
- [x] Error permission ditampilkan dengan state yang rapi bila terjadi.

### Checker

- [x] Role superadmin sesuai.
- [x] Role adminregion sesuai.
- [x] Tidak ada tombol edit settings untuk role non-superadmin.
- [x] Tidak ada endpoint baru yang dibutuhkan.

## Phase 9 - Verification dan UAT

### Automated Checks

- [x] `npm run audit:relation-display -- --strict`
- [x] `npm run audit:performance-safety`
- [x] `npm run check:consistency`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `git diff --check`

### Manual UAT

- [x] Desktop 1366px: layout 2 kolom rapi.
- [x] Desktop wide: content tidak melebar berlebihan.
- [x] Tablet: layout tetap nyaman.
- [ ] Mobile: tidak horizontal overflow.
- [x] Upload logo baru -> crop -> save -> success dialog.
- [x] Reset logo -> preview kembali default.
- [x] Edit footer text -> save -> preview/download berubah.
- [x] Detail ODP QR preview memakai logo aktif.
- [x] Bulk QR download memakai logo aktif.
- [x] Adminregion melihat hasil QR label terbaru.

## Rollout Notes

- Redesign ini frontend-only jika endpoint QR label settings sudah memadai.
- Jika nanti membutuhkan versioning logo/history setting, baru buat phase backend terpisah.
- Implementasi sebaiknya dilakukan setelah frontend clean agar diff mudah direview.

## Completion Criteria

- [ ] Semua phase checklist selesai.
- [x] Tidak ada regresi QR label settings.
- [x] Tidak ada regresi master data navigation.
- [x] Tidak ada layout/data flash pada preview QR label.
- [x] Build dan audit pass.
