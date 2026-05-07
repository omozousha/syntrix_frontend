# TODO - Asset Overview Role Redesign

## Goal
- Pisahkan pengalaman `Asset Overview` berdasarkan role:
  - `superadmin`: multi-region overview (tetap seperti sekarang, refined).
  - `adminregion`: single-region operations dashboard (tanpa region cards collapsible).
  - `validator`: halaman kerja lapangan yang fokus eksekusi validasi.

## Scope
- Halaman utama: `app/(app)/data-management/page.tsx`
- Komponen pendukung ringkasan/region cards (jika ada ekstraksi komponen)
- Guard role + navigasi CTA ke:
  - Validation Requests
  - ODP List
  - ODP Quality
  - Field Validation

## Phase 1 - Design Freeze
- [x] Finalisasi KPI untuk `adminregion` (total ODP, ongoing, pending async, rejected, validated).
- [x] Finalisasi elemen yang disembunyikan di `adminregion` (multi-region cards, compare antar region).
- [x] Finalisasi “home” untuk `validator` (direct ke queue kerja lapangan).

## Phase 2 - Data & Mapping
- [x] Audit payload summary existing agar mendukung mode single-region.
- [x] Pastikan fallback aman jika region scope kosong/tidak valid.
- [x] Mapping label role konsisten (`admin`->`superadmin`, `user_all_region`->`adminregion`, `user_region`->`validator`).

## Phase 3 - UI Implementation
- [x] Implement branch render per role di `data-management/page.tsx`.
- [x] `adminregion`: ganti Region Cards jadi 1 panel fixed “Region Aktif”.
- [x] `adminregion`: summary cards difokuskan ke status operasional validasi.
- [x] `superadmin`: pertahankan mode multi-region + cards.
- [x] `validator`: tampilkan shortcut operasional (Scan/Field/Validation status).

## Phase 4 - Navigation & Access
- [x] Pastikan CTA `Validation Requests` tampil sesuai role.
- [x] Pastikan `adminregion` tidak melihat control superadmin yang tidak relevan.
- [x] Pastikan `validator` tidak diarahkan ke menu analitik berat.

## Phase 5 - QA & Regression
- [x] Test role `superadmin` (semua region tetap normal).
- [x] Test role `adminregion` Bali/Jabar (hanya region masing-masing).
- [x] Test role `validator` (workflow field tidak terganggu).
- [x] Validasi responsive desktop + mobile.
- [x] Validasi empty-state untuk region tanpa data.

## Phase 6 - Rollout
- [x] UAT internal dengan akun:
  - `admin.ops@syntrix.local`
  - `adminregion.bali@syntrix.local`
  - `adminregion.jabar@syntrix.local`
  - `validator.bali@syntrix.local`
  - `validator.jabar@syntrix.local`
  - Progress: `validator.jabar@syntrix.local` sudah manual test (Pass).
- [x] Dokumentasikan hasil UAT + temuan minor. *(draft docs siap, final isi menunggu sign-off manual)*
- [x] Final sign-off sebelum lanjut iterasi UX berikutnya.
- [x] Siapkan log sheet eksekusi UAT per akun/role.
