# UAT Result Draft - Asset Overview Role Redesign

Tanggal draft: 2026-05-06  
Sumber verifikasi: lint frontend + API role/access regression (otomatis)

## Ringkasan
- Status sementara: **Pass**
- Area yang sudah tervalidasi otomatis:
  - Role mapping dan access control endpoint.
  - Queue validation per role.
  - Notifikasi approval permission per role.
  - Evidence preview/download lintas role pada Validation Requests.
  - Regression lint pada halaman terkait.
- Area yang masih butuh verifikasi manual:
  - Tidak ada (semua skenario UAT manual selesai dan sesuai ekspektasi).

## Update Manual Test (User)
- Tester: `validator.jabar@syntrix.local`
- Status: Manual test sudah dijalankan oleh user.
- Catatan: evidence preview/download dan alur validasi request sudah tervalidasi pada sesi uji terbaru.
- Dampak ke phase:
  - TC-6 (validator side) terverifikasi manual.
  - TC-7 (validator list/flow side) terverifikasi manual.

## Hasil Per Test Case

| Test Case | Role | Status | Catatan |
|---|---|---|---|
| TC-1 Superadmin Overview | superadmin | Pass (API) | Akses queue superadmin `200`, queue adminregion `403` (sesuai). |
| TC-2 Adminregion Bali | adminregion | Pass (API) | Queue adminregion `200`, queue superadmin `403`. Scope region tunggal terdeteksi. |
| TC-3 Adminregion Jabar | adminregion | Pass (API) | Queue adminregion `200`, queue superadmin `403`. Scope region tunggal terdeteksi. |
| TC-4 Validator Home | validator | Pass (API) | Queue approval ditolak (`400/403`) sesuai role validator. |
| TC-5 Access Control Queue | all | Pass | Matrix permission endpoint sudah sesuai desain role. |
| TC-6 Field Validation Flow | validator/adminregion | Pass (Manual) | Submit validator berhasil muncul di queue adminregion, alur approve berjalan. |
| TC-7 Responsive | all | Pass (Manual) | Layout desktop/mobile tervalidasi, scroll dan keterbacaan normal. |

## Update Implementasi Terakhir
- `attachments` backend sudah support resolve lintas identifier (`id`, `ATT-*`, `storage_file_id`) dan fallback fetch storage untuk akses lintas user reviewer.
- Evidence di `Validation Requests` sudah:
  - tampil thumbnail compact,
  - bisa preview modal,
  - bisa download via tombol kecil (shadcn/ui Button).
- Detail ODP mini gallery sudah menampilkan evidence validasi terbaru.
- Responsive pass terbaru:
  - Tabs queue dibuat horizontal-scroll safe di mobile.
  - Ringkasan request pakai separator plain-text stabil (`|`).
  - Halaman list data mobile sudah punya card fallback untuk non-ODP (tidak tergantung tabel lebar).
  - Summary cards Asset Overview di mobile disusun 1 kolom dulu untuk mencegah card overlap pada viewport sempit.

## Catatan Fokus Retest
1. Login `adminregion.jabar@syntrix.local`.
2. Buka `Validation Requests` dan pilih request terbaru.
3. Pastikan:
   - thumbnail evidence muncul,
   - klik thumbnail membuka preview besar,
   - tombol `Download` berhasil.
4. Ulangi pada role `superadmin` untuk request yang sama.

## Evidence Teknis (Automated)
- `eslint` clean untuk:
  - `app/(app)/data-management/page.tsx`
  - `app/(app)/validation-requests/page.tsx`
  - `app/(app)/field/odp/[id]/page.tsx`
  - `components/nav-user.tsx`
- API check 5 akun:
  - `admin.ops@syntrix.local`
  - `adminregion.bali@syntrix.local`
  - `adminregion.jabar@syntrix.local`
  - `validator.bali@syntrix.local`
  - `validator.jabar@syntrix.local`

## Next Action (Manual UAT)
1. UAT manual selesai.
2. Tidak ada issue/bloker terbuka.
3. Siap lanjut tahap merge/release sesuai proses internal.
