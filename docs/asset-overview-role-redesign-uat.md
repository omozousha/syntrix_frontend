# UAT Script - Asset Overview Role Redesign

## Tujuan
Memvalidasi bahwa tampilan dan akses `Asset Overview` sudah sesuai role:
- `superadmin`
- `adminregion`
- `validator`

## Akun UAT
- `admin.ops@syntrix.local`
- `adminregion.bali@syntrix.local`
- `adminregion.jabar@syntrix.local`
- `validator.bali@syntrix.local`
- `validator.jabar@syntrix.local`

Password default regional: `AdmOps!v2MHVuLW#2026`

---

## Test Case 1 - Superadmin Overview
1. Login sebagai `admin.ops@syntrix.local`.
2. Buka `Data Management > Asset Overview`.
3. Verifikasi tab `Overview` dan `Data Quality` tampil.
4. Verifikasi bagian `Region Cards` tampil multi-region dan bisa expand/collapse.
5. Verifikasi angka summary global tampil normal.

Expected:
- Superadmin melihat mode lintas region.
- Region cards tetap collapsible.
- Tidak ada error UI/API.

---

## Test Case 2 - Adminregion Single Region Panel (Bali)
1. Login sebagai `adminregion.bali@syntrix.local`.
2. Buka `Asset Overview`.
3. Verifikasi tab `Overview` dan `Data Quality` tersedia.
4. Verifikasi **tidak ada** section `Region Cards` multi-region.
5. Verifikasi ada panel fixed `Region Aktif`.
6. Verifikasi hanya data region Bali yang tampil.
7. Klik CTA:
   - `Approval Queue`
   - `List ODP`
   - `ODP Quality`

Expected:
- Tampilan adminregion fokus 1 region.
- CTA berjalan normal.
- Tidak muncul data region lain.

---

## Test Case 3 - Adminregion Single Region Panel (Jabar)
1. Login sebagai `adminregion.jabar@syntrix.local`.
2. Ulangi langkah Test Case 2.

Expected:
- Sama seperti Bali, tetapi data hanya region Jabar.

---

## Test Case 4 - Validator Home
1. Login sebagai `validator.bali@syntrix.local`.
2. Buka `Asset Overview`.
3. Verifikasi tab utama berubah ke konteks validator (`Validator Home`).
4. Verifikasi tab `Data Quality` tidak tampil.
5. Verifikasi panel multi-region tidak tampil.
6. Verifikasi CTA operasional tampil (ODP/Issue/Peta).

Expected:
- Validator hanya melihat workspace operasional.
- Tidak ada control analitik lintas region.

---

## Test Case 5 - Validation Requests Access Control
1. Login sebagai `superadmin`, buka `Validation Requests`.
2. Verifikasi queue superadmin bisa diakses.
3. Login sebagai `adminregion`, verifikasi queue adminregion bisa diakses.
4. Login sebagai `validator`, akses queue harus ditolak.

Expected:
- Superadmin: queue superadmin only.
- Adminregion: queue adminregion only.
- Validator: tidak bisa akses queue approval.

---

## Test Case 6 - Field Validation Flow (Manual)
1. Login validator.
2. Buka detail ODP via list/scan QR.
3. Isi validasi lapangan.
4. Submit.
5. Login adminregion, cek request masuk queue.

Expected:
- Submit validator sukses.
- Request muncul di queue adminregion.

---

## Test Case 7 - Responsive Check
Gunakan minimal 2 viewport:
- Desktop: `1440 x 900`
- Mobile: `390 x 844`

Verifikasi:
- Tidak ada overlap komponen.
- Card/panel bisa dibaca dan di-scroll normal.
- CTA tetap bisa di-tap/click.

---

## Template Hasil UAT
| Test Case | Role | Status (Pass/Fail) | Catatan |
|---|---|---|---|
| TC-1 Superadmin Overview | superadmin |  |  |
| TC-2 Adminregion Bali | adminregion |  |  |
| TC-3 Adminregion Jabar | adminregion |  |  |
| TC-4 Validator Home | validator |  |  |
| TC-5 Access Control Queue | all |  |  |
| TC-6 Field Validation Flow | validator/adminregion |  |  |
| TC-7 Responsive | all |  |  |

---

## Sign-off
- Adminregion Bali: _______________
- Adminregion Jabar: ______________
- Superadmin: _____________________
- Tanggal: ________________________
