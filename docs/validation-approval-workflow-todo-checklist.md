# TODO Checklist - Validation Approval Workflow

## 0) Design Freeze
- [x] Finalisasi daftar status + transition table.
- [x] Finalisasi payload minimal yang harus direview.
- [x] Finalisasi aturan note wajib saat reject.

## 1) Backend Foundation
- [x] Buat migration `validation_requests`.
- [x] Buat migration `validation_request_logs`.
- [x] Tambah constraint status transition yang valid.
- [x] Tambah constraint reject note wajib.

## 2) API Contract
- [x] `POST /validation-requests` (submit oleh validator).
- [x] `GET /validation-requests?queue=adminregion`.
- [x] `GET /validation-requests?queue=superadmin`.
- [x] `POST /validation-requests/:id/adminregion/approve`.
- [x] `POST /validation-requests/:id/adminregion/reject`.
- [x] `POST /validation-requests/:id/superadmin/approve`.
- [x] `POST /validation-requests/:id/superadmin/reject`.
- [x] `GET /validation-requests/:id/history`.

## 3) Permission & Region Scope
- [x] Tambah role `superadmin`.
- [x] Tambah role `adminregion`.
- [x] Tambah role `validator`.
- [x] Enforce region scope di endpoint review adminregion.
- [x] Enforce akses global di superadmin.

## 4) Apply Logic ke Data Utama
- [x] Implement apply payload ke `devices`/`device_ports` hanya setelah approval final.
- [x] Simpan snapshot before/after untuk audit.
- [x] Pastikan rollback-safe saat apply gagal.

## 5) Frontend - Validator
- [x] Ubah submit validasi jadi create request.
- [x] Tampilkan status request terbaru di halaman validasi ODP.
- [x] Tampilkan note reject jika request dikembalikan.

## 6) Frontend - Adminregion Queue
- [x] Buat halaman queue review adminregion.
- [x] Tampilkan diff data + evidence.
- [x] Approve action.
- [x] Reject action + field note wajib.

## 7) Frontend - Superadmin Queue
- [x] Buat halaman queue review superadmin.
- [x] Tampilkan diff data + evidence.
- [x] Approve final action.
- [x] Reject action + field note wajib.

## 8) Audit Trail Sync
- [x] Log event saat submit request.
- [x] Log event saat approve/reject adminregion.
- [x] Log event saat approve/reject superadmin.
- [x] Log event saat apply ke asset utama.
- [x] Tambah filter audit trail berbasis `request_id`.

## 9) Testing
- [x] Unit test state machine transition.
- [x] Integration test alur validator -> adminregion -> superadmin.
- [x] Authorization test per role + per region.
- [x] Regression test flow ODP existing.

## 10) Rollout
- [x] Feature flag per role.
- [x] Pilot di 1 region.
- [x] Monitoring reject reason untuk evaluasi UX.
- [x] Go-live bertahap.

## Catatan Implementasi
- [x] Pastikan perubahan sinkron dengan Trash & Audit Trail.
- [x] Pastikan semua action penting menampilkan dialog sukses/gagal.
- [x] Pastikan queue responsif untuk desktop/mobile web.
