# Syntrix Frontend Update Log

## Current Release

- App: Syntrix Frontend
- Version: 0.1.0
- Platform focus: Web operational console
- Audience: superadmin, adminregion, director, owner, dan validator redirect
- Update date: 29 Mei 2026
- Detail logs:
  - [syntrix-frontend-0.1.0.md](./syntrix-frontend-0.1.0.md)
  - [syntrix-frontend-0.1.0-ui-refresh-20260528.md](./syntrix-frontend-0.1.0-ui-refresh-20260528.md)

## Release Summary

Syntrix Frontend saat ini difokuskan sebagai operational console untuk manajemen aset fiber optic, request approval, master data, QR label, dan review hasil validasi dari Syntrix-One. Validator tidak lagi diarahkan melakukan validasi dari browser, tetapi melalui aplikasi Syntrix-One.

## Main Changes

- Menyegarkan login screen, header, sidebar, dan layout operasional agar lebih compact.
- Menjaga primary navigation label, URL structure, logo, form field name, dan legal copy tetap stabil.
- Menambahkan QR browser fallback yang menjelaskan bahwa validasi hanya dilakukan melalui Syntrix-One.
- Menambahkan format download QR label untuk detail ODP dan bulk QR download.
- Membatasi bulk QR menjadi 16 label per lembar dengan format 2 kolom x 8 baris.
- Menghapus link form validasi dari detail QR ODP.
- Mengganti tombol copy link di detail ODP menjadi reminder validasi ke validator region terkait.
- Menambahkan preview evidence pada card checklist kondisi di halaman request.
- Menambahkan pembanding data existing vs hasil validasi validator pada request approval.
- Menampilkan nama actor, bukan hanya user id, pada halaman request jika data tersedia dari backend.
- Menyesuaikan role superadmin dan adminregion pada tampilan sidebar/header dan workflow approval.
- Menambahkan tenant sebagai referensi master data dan field device create/edit.
- Menampilkan tenant pada detail device dan QR browser fallback jika tersedia dari endpoint.
- Menyesuaikan detail ODP agar hasil validasi tidak mengubah data utama sebelum approval selesai.
- Menambahkan installation date ODP dan validation status ongoing untuk proses menunggu approval.

### Fase 2 — Visual Port Tray (Juli 2026)

**Fase 2a — Port Tray Visualizer**
- Menambahkan visualisasi port tray untuk device OTB dengan layout dinamis (auto-generate tray berdasarkan `total_ports`).
- Menambahkan port card dengan fiber color stripe (TIA/EIA-598 12-color code).
- Menambahkan port tray badge (total/used/idle/reserved/down).
- Menambahkan port assignment drawer untuk manage koneksi port.
- Menambahkan topology chain visualizer untuk ODC/OTB.

**Fase 2b — Format Port Drawer**
- Memformat ulang port assignment drawer agar konsisten dengan UI detail device.

**Fase 2c — Expand Tray ke ODC & JC**
- Memperluas port tray visualizer ke device ODC (Optical Distribution Cabinet) dan JC (Joint Closure).
- Menambahkan device-aware peer device mapping (`getPeerDeviceTypes`).
- Menambahkan `resolveTrayLayout()` untuk layout berbeda per device type.

**Fase 2d — Layout Rules dari Master Data**
- Menambahkan tipe `TrayConfigPayload`, fungsi `parseTrayConfigFromPayload()`.
- Priority layout: master data (`tray_config`) → static layout (ODC/JC) → dynamic layout (OTB).
- Backend API expose `tray_config` dari `asset_models`.
- Frontend membaca `tray_config` langsung dari response asset_model.
- Migration SQL: kolom `tray_config jsonb` di `asset_models`.
- Seed data: sample model OTB-24/48/96, ODC-48/72, JC-96/144 dengan tray_config.

**Fase 2e — Integrasi & Auto-generate Slot**
- Auto-generate placeholder port untuk semua slot di tray (tidak perlu port records di DB).
- `totalPorts` fallback ke `capacity_core` jika `total_ports` tidak tersedia.
- Responsive grid: `auto-fit` dengan `minmax(64px, 1fr)`, card 64×64px.
- Tube color: setiap tray/tube punya warna background pastel + border kiri warna khas (8 warna: biru, oranye, hijau, ungu, pink, cyan, kuning, merah).
- Fiber color stripe (TIA/EIA-598) tetap di setiap port card.
- Semua slot interaktif (bisa di-klik untuk assign), placeholder tidak disabled.

## Role Behavior

- Superadmin dapat mengelola data lintas region sesuai aksesnya.
- Adminregion hanya mengelola dan menerima notifikasi untuk region terkait.
- Validator web diarahkan ke Syntrix-One dan tidak menggunakan browser untuk form validasi.
- Director dan owner tetap memakai frontend sebagai tampilan monitoring dan review.

## Backend Dependency

Frontend saat ini bergantung pada endpoint backend untuk:

- Device detail dan public QR fallback.
- Tenant master data.
- Validation request approval.
- Notification inbox dan reminder validasi.
- Actor enrichment untuk submitted by, reviewer, dan validation history.

## Release Checklist

- [ ] Jalankan `npm run lint`.
- [ ] Jalankan `npm run build`.
- [ ] Uji login superadmin.
- [ ] Uji login adminregion.
- [ ] Uji halaman Data Management dan detail ODP.
- [ ] Uji halaman Requests untuk approval adminregion dan superadmin.
- [ ] Uji QR browser fallback dari QR device.
- [ ] Uji bulk download QR.
- [ ] Uji create/edit device dengan tenant.
- [ ] Uji validator web redirect policy.

## Notes

File ini adalah update log utama untuk Syntrix Frontend. Untuk rilis besar berikutnya, buat file detail terpisah di folder `updates`.
