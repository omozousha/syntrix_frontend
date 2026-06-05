# QR Label Redesign & Settings Todo Checklist

Tanggal: 4 Juni 2026

## Tujuan

Merapikan desain label QR device agar seragam antara bulk download dan download QR dari detail ODP, serta menyiapkan fitur pengaturan logo QR oleh superadmin melalui Master Data.

## Prinsip Desain

- Label QR harus mudah discan setelah dicetak.
- Bulk dan detail ODP wajib menggunakan renderer/desain yang sama.
- QR tetap membuka alur resmi Syntrix-One/app-required flow.
- Logo tengah QR harus kecil dan aman terhadap readability QR.
- Jika logo belum diset superadmin, sistem memakai logo default atau tanpa logo.
- Perubahan tidak boleh mengubah tujuan link QR yang sudah berjalan.

## Scope Fase 1 - Redesign Label Tanpa Backend

Implementasi cepat untuk menyamakan tampilan label QR menggunakan konfigurasi logo default lokal.

### Todo

- [x] Update shared renderer di `lib/qr-label.ts`.
- [x] Ubah layout label menjadi format referensi:
  - [x] QR besar di sisi kiri.
  - [x] Separator vertikal hitam di tengah label.
  - [x] Informasi device di sisi kanan.
  - [x] Footer merah: `Scan QR untuk membuka detail/validasi Device`.
- [x] Tambahkan logo kecil di tengah QR.
  - [x] Fase 1 memakai logo default dari `public/syntrix-logo.png` via `/syntrix-logo.png`.
- [x] Pastikan QR memakai `errorCorrectionLevel: "H"` saat ada logo tengah.
- [x] Samakan output detail ODP PNG dengan bulk PDF.
- [x] Ubah bulk PDF menjadi 2 kolom x 6 baris.
- [x] Batasi maksimal 12 label per halaman.
- [x] Pastikan file detail ODP tetap PNG.
- [x] Pastikan bulk tetap PDF.
- [x] Pastikan label tetap berisi:
  - [x] Nama device.
  - [x] ID inventory/device.
  - [x] Type device.
  - [x] POP name dan POP code jika tersedia.

### Acceptance Criteria

- [x] Download QR dari detail ODP menghasilkan desain label baru.
- [x] Bulk QR menghasilkan desain label yang sama.
- [x] Bulk PDF berisi 12 label per halaman dalam 2 kolom x 6 baris.
- [x] QR masih bisa discan dari hasil PNG detail.
- [x] QR masih bisa discan dari hasil bulk PDF.
- [x] QR tetap mengarah ke URL/app-required flow yang sama.
- [x] Tidak ada UUID POP mentah tampil di label jika POP code tidak tersedia.

## Scope Fase 2 - QR Label Settings untuk Superadmin

Menambahkan pengaturan logo QR di Master Data agar superadmin bisa mengganti logo tengah QR tanpa perubahan kode.

### Backend Todo

- [x] Tentukan storage config:
  - [ ] Opsi A: tabel `app_settings`.
  - [x] Opsi B: tabel khusus `qr_label_settings`.
- [x] Tambahkan field minimal:
  - [x] `qr_logo_attachment_id`.
  - [x] `qr_logo_url` atau resolved attachment URL.
  - [x] `footer_text`.
  - [x] `is_active`.
  - [x] `updated_by_user_id`.
  - [x] `updated_at`.
- [x] Buat endpoint read config QR label.
- [x] Buat endpoint update config QR label khusus superadmin.
- [x] Validasi upload logo:
  - [x] MIME type image.
  - [x] Ukuran file maksimal.
  - [x] Resolusi minimal.
- [x] Pastikan adminregion/validator tidak bisa mengubah config.

### Frontend Todo

- [x] Tambah menu/section `QR Label Settings` di Master Data.
- [x] Tampilkan preview logo QR aktif.
- [x] Tambahkan upload logo untuk superadmin.
- [x] Tambahkan tombol reset ke logo default.
- [x] Tambahkan preview label sebelum disimpan.
- [x] Integrasikan config logo ke `lib/qr-label.ts`.
- [x] Tambahkan loading/error state saat config belum termuat.
- [x] Fallback ke logo default jika config gagal dimuat.

### Acceptance Criteria

- [x] Superadmin bisa upload logo QR dari Master Data.
- [x] Logo baru muncul di label detail ODP.
- [x] Logo baru muncul di bulk QR.
- [x] Adminregion tidak bisa melihat aksi edit setting jika tidak diizinkan.
- [x] Validator tidak memiliki akses ke setting.
- [x] Jika logo corrupt/gagal dimuat, QR tetap bisa dibuat tanpa merusak proses download.

### Database Apply

Jika production database belum menerima migration, jalankan:

```sql
-- syntrix_backend/database/manual/20260605_apply_qr_label_settings.sql
```

## Scope Fase 3 - Hardening dan UAT Print

Validasi hasil nyata agar label benar-benar layak dicetak dan ditempel di perangkat.

### Todo

- [x] Test scan PNG detail di layar.
- [x] Test scan bulk PDF di layar.
- [x] Test scan hasil print ukuran asli.
- [x] Test logo kecil, sedang, dan besar.
- [x] Batasi ukuran logo jika mengganggu QR.
- [x] Review jarak margin label agar aman saat dipotong.
- [x] Review kontras teks pada label.
- [x] Review hasil label untuk nama device panjang.
- [x] Review hasil label untuk POP name panjang.

### Acceptance Criteria

- [x] QR tetap terbaca dengan kamera Syntrix-One.
- [x] QR tetap terbaca dengan kamera Android umum.
- [x] Teks tidak keluar dari label.
- [x] Nama panjang terpotong rapi.
- [x] Label tetap konsisten di halaman 1 dan halaman berikutnya.

## Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Logo terlalu besar | QR sulit discan | Batasi logo 12-18% ukuran QR dan gunakan correction level H |
| Format bulk berubah | Layout print tidak sesuai | Tetapkan 2 kolom x 6 baris di shared renderer |
| Detail PNG dan bulk PDF drift | Label berbeda antar fitur | Semua memakai `lib/qr-label.ts` |
| Config logo gagal dimuat | Download QR gagal | Fallback ke logo default/tanpa logo |
| Adminregion mengubah logo global | Brand tidak terkendali | Endpoint update khusus superadmin |

## Checker

Jalankan setelah implementasi:

```bash
npm run check:consistency
npm run lint
npm run build
git diff --check
```

Manual checker:

- [x] Download QR detail ODP.
- [x] Download bulk QR dari list device.
- [x] Buka PDF dan hitung 12 label per halaman.
- [x] Scan QR dari detail PNG.
- [x] Scan QR dari bulk PDF.
- [x] Pastikan logo berada di tengah QR.
- [x] Pastikan label detail dan bulk memakai desain sama.
