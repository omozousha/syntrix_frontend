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
  - [x] Fase 1 memakai logo default dari `app/favicon.ico` via `/favicon.ico`.
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
- [ ] QR masih bisa discan dari hasil PNG detail.
- [ ] QR masih bisa discan dari hasil bulk PDF.
- [x] QR tetap mengarah ke URL/app-required flow yang sama.
- [x] Tidak ada UUID POP mentah tampil di label jika POP code tidak tersedia.

## Scope Fase 2 - QR Label Settings untuk Superadmin

Menambahkan pengaturan logo QR di Master Data agar superadmin bisa mengganti logo tengah QR tanpa perubahan kode.

### Backend Todo

- [ ] Tentukan storage config:
  - [ ] Opsi A: tabel `app_settings`.
  - [ ] Opsi B: tabel khusus `qr_label_settings`.
- [ ] Tambahkan field minimal:
  - [ ] `qr_logo_attachment_id`.
  - [ ] `qr_logo_url` atau resolved attachment URL.
  - [ ] `footer_text`.
  - [ ] `is_active`.
  - [ ] `updated_by_user_id`.
  - [ ] `updated_at`.
- [ ] Buat endpoint read config QR label.
- [ ] Buat endpoint update config QR label khusus superadmin.
- [ ] Validasi upload logo:
  - [ ] MIME type image.
  - [ ] Ukuran file maksimal.
  - [ ] Resolusi minimal.
- [ ] Pastikan adminregion/validator tidak bisa mengubah config.

### Frontend Todo

- [ ] Tambah menu/section `QR Label Settings` di Master Data.
- [ ] Tampilkan preview logo QR aktif.
- [ ] Tambahkan upload logo untuk superadmin.
- [ ] Tambahkan tombol reset ke logo default.
- [ ] Tambahkan preview label sebelum disimpan.
- [ ] Integrasikan config logo ke `lib/qr-label.ts`.
- [ ] Tambahkan loading/error state saat config belum termuat.
- [ ] Fallback ke logo default jika config gagal dimuat.

### Acceptance Criteria

- [ ] Superadmin bisa upload logo QR dari Master Data.
- [ ] Logo baru muncul di label detail ODP.
- [ ] Logo baru muncul di bulk QR.
- [ ] Adminregion tidak bisa melihat aksi edit setting jika tidak diizinkan.
- [ ] Validator tidak memiliki akses ke setting.
- [ ] Jika logo corrupt/gagal dimuat, QR tetap bisa dibuat tanpa merusak proses download.

## Scope Fase 3 - Hardening dan UAT Print

Validasi hasil nyata agar label benar-benar layak dicetak dan ditempel di perangkat.

### Todo

- [ ] Test scan PNG detail di layar.
- [ ] Test scan bulk PDF di layar.
- [ ] Test scan hasil print ukuran asli.
- [ ] Test logo kecil, sedang, dan besar.
- [ ] Batasi ukuran logo jika mengganggu QR.
- [ ] Review jarak margin label agar aman saat dipotong.
- [ ] Review kontras teks pada label.
- [ ] Review hasil label untuk nama device panjang.
- [ ] Review hasil label untuk POP name panjang.

### Acceptance Criteria

- [ ] QR tetap terbaca dengan kamera Syntrix-One.
- [ ] QR tetap terbaca dengan kamera Android umum.
- [ ] Teks tidak keluar dari label.
- [ ] Nama panjang terpotong rapi.
- [ ] Label tetap konsisten di halaman 1 dan halaman berikutnya.

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

- [ ] Download QR detail ODP.
- [ ] Download bulk QR dari list device.
- [ ] Buka PDF dan hitung 12 label per halaman.
- [ ] Scan QR dari detail PNG.
- [ ] Scan QR dari bulk PDF.
- [ ] Pastikan logo berada di tengah QR.
- [ ] Pastikan label detail dan bulk memakai desain sama.
