# Request Review Generalization Checklist

Tujuan: menjadikan halaman request sebagai pusat approval semua perubahan aset, bukan hanya validasi lapangan.

## Phase 1 - Request Approval Dasar

- [x] Rename label UI dari "Validation Requests" menjadi "Requests".
- [x] Adminregion create device masuk sebagai request approval superadmin.
- [x] Validator tetap submit validasi lewat request approval, bukan update langsung ke asset utama.
- [x] Tampilkan tipe request secara jelas di Approval Inbox.
- [x] Tampilkan detail Create Device Request dalam format field review, bukan hanya raw JSON.
- [x] Perkaya snapshot backend untuk request device baru agar detail review superadmin lebih lengkap.

## Phase 2 - Route dan Navigasi

- [x] Tambah route alias `/requests` untuk halaman request.
- [x] Pertahankan redirect/backward compatibility dari `/validation-requests`.
- [x] Pastikan semua menu dan notifikasi mengarah ke route final yang sama.

## Phase 3 - Request Scope Lanjutan

- [x] Adminregion create POP masuk approval superadmin.
- [x] Adminregion create route masuk approval superadmin.
- [x] Adminregion create project masuk approval superadmin.
- [x] Adminregion update/archive asset masuk approval superadmin.

## Phase 4 - Role UI Polish

- [x] Validator: halaman field validation dibuat lebih mobile-first.
- [x] Adminregion: hanya melihat request dan data region terkait.
- [x] Superadmin: melihat queue final approval lintas region tanpa submenu yang tidak perlu.

## Phase 5 - UAT

- [x] UAT checklist dibuat di `docs/request-review-generalization-uat.md`.
- [x] UAT execution log dibuat di `docs/request-review-generalization-uat-execution-log.md`.
- [x] Preflight checklist dibuat di `docs/request-review-generalization-preflight.md`.
- [ ] TC-RQ-1 adminregion create ODP, superadmin menerima notifikasi, request tampil jelas, approve, asset muncul.
- [ ] TC-RQ-2 validator submit validasi, adminregion review, superadmin final approve, status menjadi validated.
- [ ] TC-RQ-3 reject wajib note dan kembali ke role sebelumnya.
- [ ] TC-RQ-4 adminregion create POP/Route/Project masuk approval dan muncul setelah approve.
- [ ] TC-RQ-5 adminregion update/archive masuk approval, diff tampil, apply setelah approve.
- [ ] TC-RQ-6 role UI sesuai ekspektasi.
