# Checklist - Asset Overview Role Redesign

## Functional Checklist
- [x] Superadmin tetap melihat overview lintas region.
- [x] Adminregion hanya melihat data region yang menjadi scope user.
- [x] Validator tidak melihat panel multi-region.
- [x] Summary angka pada adminregion hanya dari region aktif user.
- [x] Region cards collapsible tidak tampil untuk adminregion.
- [x] Panel region adminregion tampil fixed (non-collapsible) dan informatif.

## Navigation Checklist
- [x] CTA ke `Validation Requests` tersedia untuk adminregion/superadmin.
- [x] CTA ke `Field ODP`/operasional tersedia untuk validator.
- [x] Link yang tidak relevan role tidak muncul (role-aware UI).

## Data Integrity Checklist
- [x] Tidak ada data region lain bocor di role adminregion.
- [x] Empty state muncul jelas jika region belum ada request/data.
- [x] Status validasi di list device tetap tampil konsisten.

## UI/UX Checklist
- [x] Layout desktop rapi tanpa card overlap.
- [x] Layout mobile tetap terbaca dan bisa di-scroll normal.
- [x] Jarak/padding konsisten dengan halaman app lainnya.
- [x] Copy text jelas untuk konteks role region vs superadmin.

## Regression Checklist
- [x] Validation Requests page tetap bekerja normal.
- [x] Notifikasi approval tetap berjalan.
- [x] Field validation flow (scan QR -> submit) tetap normal.
- [x] Audit trail/trash behavior tidak berubah di role yang berhak.

## Sign-off
- [x] Verifikasi oleh adminregion Bali.
- [x] Verifikasi oleh adminregion Jabar.
- [x] Verifikasi oleh superadmin.
- [x] Semua blocker = 0 sebelum merge final.

## Referensi Eksekusi
- UAT script: `docs/asset-overview-role-redesign-uat.md`
- Draft hasil UAT otomatis: `docs/asset-overview-role-redesign-uat-result-draft.md`
- Temuan minor UAT: `docs/asset-overview-role-redesign-uat-minor-findings.md`
- Log eksekusi UAT manual: `docs/asset-overview-role-redesign-uat-execution-log.md`
