# Request Review Generalization UAT Execution Log

Tanggal mulai: 2026-05-08

Status awal: code complete, pushed, menunggu migration backend dan UAT manual.

## Pre-UAT Sanity Check

- [x] Frontend lint untuk halaman request, create/list data management, validator field ODP, nav/sidebar.
- [x] Backend syntax check untuk resource controller, validation controller, validation service.
- [ ] Migration backend `20260507_generalize_validation_requests_entity.sql` sudah dijalankan di database target.

## Execution Matrix

| Test Case | Scope | Status | Tester | Notes |
| --- | --- | --- | --- | --- |
| TC-RQ-1 | Adminregion create ODP -> superadmin approve -> asset muncul | Not Run | - | Jalankan setelah migration backend. |
| TC-RQ-2 | Validator submit validasi -> adminregion approve -> superadmin approve | Not Run | - | Pastikan dialog sukses refresh halaman. |
| TC-RQ-3 | Reject wajib note | Not Run | - | Uji adminregion dan superadmin. |
| TC-RQ-4 | Adminregion create POP/Route/Project request | Not Run | - | Pastikan muncul setelah superadmin approve. |
| TC-RQ-5 | Adminregion update/archive request | Not Run | - | Pastikan diff tampil sebelum approve. |
| TC-RQ-6 | Role UI | Not Run | - | Validator mobile, adminregion scope, superadmin queue. |

## Sign-Off

- [ ] Adminregion Jabar
- [ ] Adminregion Bali
- [ ] Validator Jabar/Bali
- [ ] Superadmin

## Known Preconditions

- Backend deployment harus sudah berisi commit `68f7727`.
- Frontend deployment harus sudah berisi commit `cddab04`.
- Database target harus menjalankan migration `20260507_generalize_validation_requests_entity.sql`.
