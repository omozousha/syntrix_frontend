# Validation Approval Workflow (Brainstorm + Konsep Final)

## Tujuan
Membangun alur validasi asset (fokus ODP tahap awal) dengan 3 role agar kualitas data terjaga sebelum masuk ke asset overview.

## Role
1. `superadmin`
- Akses penuh semua region.
- Buat akun `adminregion` dan `validator`.
- Reviewer final approval.

2. `adminregion`
- Akses hanya region scope terkait.
- Buat akun `validator` untuk region yang sama.
- Reviewer level 1 (approve/reject validasi validator).

3. `validator`
- Akses fokus ke validasi device lapangan.
- Submit validasi sebagai request (tidak direct update data utama).

## Prinsip Utama
- Semua aksi validator/adminregion bersifat request.
- Data utama berubah hanya saat stage approval yang diizinkan.
- Reject wajib disertai note.
- Semua transition wajib masuk audit trail.

## State Machine Validasi (ODP)
- `unvalidated`
- `ongoing_validated` (setelah validator submit)
- `pending_async` (setelah adminregion approve)
- `validated` (setelah superadmin approve)
- `rejected_by_adminregion`
- `rejected_by_superadmin`

### Transition Table (Final)
| Current Status | Actor | Action | Next Status | Note Requirement |
|---|---|---|---|---|
| `unvalidated` | `validator` | submit | `ongoing_validated` | optional |
| `rejected_by_adminregion` | `validator` | resubmit | `ongoing_validated` | optional |
| `ongoing_validated` | `adminregion` | approve | `pending_async` | optional |
| `ongoing_validated` | `adminregion` | reject | `rejected_by_adminregion` | **required** |
| `pending_async` | `superadmin` | approve | `validated` | optional |
| `pending_async` | `superadmin` | reject | `rejected_by_superadmin` | **required** |
| `rejected_by_superadmin` | `adminregion` | revise+resubmit | `pending_async` | optional |

### Transition Rules Tambahan
- `validated` adalah status terminal (read-only terhadap workflow request aktif).
- Satu entity (`devices.id`) hanya boleh punya **1 request aktif** (`ongoing_validated`/`pending_async`) pada satu waktu.
- Semua action workflow wajib menyimpan jejak log status sebelum/sesudah.

## Alur Validasi
1. ODP awal status `unvalidated`.
2. Validator scan QR, isi validasi, submit -> `ongoing_validated`.
3. Adminregion review:
- Approve -> `pending_async` (masuk queue superadmin).
- Reject + note wajib -> kembali ke validator.
4. Superadmin review:
- Approve -> `validated` (final).
- Reject + note wajib -> kembali ke adminregion.

## Rule Otorisasi
- Validator hanya submit request region sendiri.
- Adminregion hanya review request di region scope-nya.
- Superadmin review semua region.
- Enforce di backend (bukan frontend saja).

## Sinkron Audit Trail
Setiap aksi wajib log:
- `submitted`
- `approved_by_adminregion`
- `rejected_by_adminregion`
- `approved_by_superadmin`
- `rejected_by_superadmin`
- `applied_to_asset`

Log minimal:
- actor_id, actor_role
- entity_type, entity_id
- request_id
- before_status, after_status
- note (khusus reject wajib)
- timestamp

## Scope V1
- Entity: ODP + port ODP + evidence validasi.
- Belum semua device type.
- Belum offline mode mobile.

## Payload Minimal Yang Direview (Final)
### Request Header
- `request_id`
- `entity_type` (`device`)
- `entity_id` (`devices.id`)
- `region_id`
- `submitted_by_user_id`
- `current_status`

### Snapshot Data
- `device`:
  - `device_name`, `status`, `validation_status`, `validation_date`
  - `splitter_ratio`, `total_ports`, `used_ports`
  - `address`, `longitude`, `latitude`
- `device_ports` (array):
  - `id`, `port_index`, `port_label`, `status`, `customer_id`, `ont_device_id`, `notes`

### Evidence & Checklist
- `checklist`:
  - `physical_ok`, `splitter_ok`, `port_mapping_ok`, `qr_label_ok`, `label_ok`
- `finding_note`
- `evidence_attachments` (array id/url)

### Review Metadata
- `adminregion_review_note`
- `superadmin_review_note`
- `approved_by`, `approved_at`
- `rejected_by`, `rejected_at`

## Aturan Reject Note (Final)
- Reject oleh `adminregion`: note wajib, minimal 10 karakter.
- Reject oleh `superadmin`: note wajib, minimal 10 karakter.
- Reject tanpa note harus ditolak backend (`400`).
- Note reject tampil ulang ke actor sebelumnya sebagai feedback koreksi.

## KPI Keberhasilan
- Tidak ada direct update validator ke data utama.
- 100% reject memiliki note.
- Seluruh lifecycle validasi tercatat di audit trail.
- Status UI konsisten dengan backend state machine.
