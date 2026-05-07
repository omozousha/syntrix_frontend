# Validation Approval Rollout Plan

## Feature Flag
- Backend flag: `VALIDATION_WORKFLOW_ENABLED`
  - `true`: workflow endpoint aktif.
  - `false`: endpoint workflow return `503`.

## Pilot Region
- Backend flag: `VALIDATION_WORKFLOW_ALLOWED_REGION_IDS`
  - Isi `public.regions.id` dipisah koma.
  - Contoh: `5bab5087-a0c2-4f5c-bb12-9901873d3728,aeda3ba7-a5ef-48d7-a3b4-01df0e6697c5`
  - Kosong = semua region diizinkan.

## Monitoring Reject Reason
- Endpoint:
  - `GET /api/v1/validation-requests/metrics/reject-reasons`
  - Optional query: `limit=1000`
- Akses:
  - `adminregion`: scoped sesuai region user.
  - `superadmin`: global semua region.

## Go-Live Bertahap
1. Aktifkan flag workflow (`VALIDATION_WORKFLOW_ENABLED=true`) di staging.
2. Isi 1 region pilot di `VALIDATION_WORKFLOW_ALLOWED_REGION_IDS`.
3. Validasi alur harian:
   - submit validator
   - approve/reject adminregion
   - approve/reject superadmin
4. Pantau reject reason metrics dan audit trail.
5. Tambah region pilot bertahap sampai semua region.
6. Jika ada issue kritikal:
   - set `VALIDATION_WORKFLOW_ENABLED=false` untuk stop sementara.
