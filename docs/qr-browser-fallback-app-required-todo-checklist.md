# QR Browser Fallback App Required Todo Checklist

## Tujuan

Merapihkan alur jika QR device Syntrix dibuka dari browser biasa, bukan dari aplikasi Syntrix-One.

Prinsip utama:

- Validasi lapangan hanya boleh dimulai dari aplikasi Syntrix-One.
- Route web QR tetap boleh dibuka, tetapi hanya sebagai landing/instruction screen.
- Form validasi web lama tidak boleh lagi menjadi jalur validasi aktif.
- Backend tetap menjadi pengaman utama melalui token, role validator, dan scope region.

## Kondisi Saat Ini

- QR detail ODP masih mengarah ke URL web `/field/odp/[id]`.
- Route `/field/odp/[id]` di Syntrix frontend masih berisi form validasi ODP browser.
- Syntrix-One sudah dapat membaca QR URL lalu lookup device dan membuka form validasi app.
- Validator web sudah diarahkan ke Syntrix-One untuk beberapa kondisi login, tetapi user yang scan QR dari kamera/browser masih dapat melihat flow web yang membingungkan.

## Target UX

Jika QR dibuka di browser:

1. Tampilkan screen khusus `Syntrix-One Required`.
2. Tampilkan informasi ringkas device jika bisa di-load:
   - nama ODP/device
   - type device
3. Jelaskan bahwa validasi hanya bisa dilakukan lewat Syntrix-One.
4. Sediakan CTA:
   - `Buka Syntrix-One`
   - `Download APK` atau `Hubungi Admin` jika link APK belum tersedia.
5. Jangan tampilkan field validasi, tombol submit, upload evidence, atau editor port.

Jika QR dibuka dari Syntrix-One:

1. App tetap membaca QR URL.
2. App mengekstrak device ID dari URL.
3. App lookup device ke backend.
4. Jika region sesuai, direct ke form validasi.
5. Jika region tidak sesuai, tampilkan screen region mismatch.

## Scope Frontend Web

- [x] Audit route `app/(app)/field/odp/[id]/page.tsx`.
- [x] Ganti form validasi browser dengan App Required Screen.
- [x] Pastikan screen tetap memakai brand Syntrix dan gaya UI operasional yang konsisten.
- [x] Load detail device read-only secukupnya untuk konteks QR:
  - [x] nama device / nama ODP lama
  - [x] type device
- [x] Jika device gagal di-load, tampilkan fallback aman:
  - [x] `QR valid, tetapi data device belum dapat dimuat.`
  - [x] instruksi scan ulang lewat Syntrix-One.
- [x] Tambahkan CTA `Buka Syntrix-One`.
- [x] Tambahkan fallback CTA `Download APK` atau `Hubungi Admin`.
- [x] Pastikan tidak ada form validation lama yang bisa di-submit dari route ini.
- [x] Pastikan adminregion/superadmin tidak diarahkan ke form validasi dari web.

## Scope Link Internal Frontend

- [x] Audit semua link ke `/field/odp/[id]`.
- [x] Ubah link yang konteksnya adminregion/superadmin menjadi detail ODP biasa jika lebih tepat.
- [x] Pertahankan URL QR untuk label/download QR agar QR tetap kompatibel dengan Syntrix-One.
- [x] Hilangkan copy yang memberi kesan validasi bisa dilakukan dari browser.
- [x] Pastikan `Field View` tidak lagi dipakai sebagai istilah untuk adminregion/superadmin.

## Scope Syntrix-One App

- [x] Pastikan QR parser tetap mendukung URL `/field/odp/[id]`.
- [x] Pastikan scan QR dari label lama tetap bisa membuka form validasi app.
- [x] Pastikan scan QR dari label baru tetap bisa membuka form validasi app.
- [x] Pastikan direct form hanya terjadi setelah device berhasil di-load.
- [x] Pastikan region mismatch tetap tampil jika device bukan scope validator.
- [x] Pastikan pesan error QR tidak cocok tetap jelas untuk QR non-Syntrix.

## Scope Backend

Backend tidak perlu membuka detail penuh untuk fase ini, tetapi ada endpoint public minimal untuk konteks QR:

- [x] Tambahkan endpoint public read-only `GET /api/v1/public/qr/devices/:id`.
- [x] Batasi response endpoint public hanya ke:
  - [x] id
  - [x] type device
  - [x] nama device / nama ODP lama
- [x] Endpoint public tidak menampilkan inventory ID, POP, region, koordinat, port, atau evidence.
- [ ] Endpoint submit validation request tetap butuh token validator.
- [ ] Role selain validator tidak bisa submit validasi lapangan.
- [ ] Scope region validator tetap divalidasi.
- [ ] Device yang tidak ditemukan tidak bisa membuat request validasi.
- [ ] Tidak ada bypass dari browser hanya karena user tahu URL QR.

## App Link / Deep Link

Fase awal cukup memakai CTA manual:

- [x] `Buka Syntrix-One` mencoba custom scheme yang sudah ada jika tersedia.
- [x] Jika custom scheme gagal, user tetap melihat instruksi.

Fase lanjutan:

- [ ] Pertimbangkan Android App Links untuk domain `syntrix-one.vercel.app`.
- [ ] Tambahkan asset links Android jika ingin URL QR otomatis membuka app.
- [ ] Siapkan fallback jika app belum terinstall.

## Copy Yang Disarankan

Judul:

`Validasi hanya melalui Syntrix-One`

Deskripsi:

`QR ini terdaftar sebagai device Syntrix. Untuk menjaga keamanan, scope region, dan evidence lapangan, validasi hanya dapat dilakukan dari aplikasi Syntrix-One.`

CTA utama:

`Buka Syntrix-One`

CTA fallback:

`Minta APK ke Admin`

Pesan device tidak ditemukan:

`Data device belum dapat dimuat. Scan ulang QR melalui Syntrix-One atau hubungi admin jika label QR rusak.`

## Verifikasi

- [ ] Buka QR URL dari desktop browser.
- [ ] Buka QR URL dari mobile browser.
- [ ] Pastikan tidak ada form validasi web.
- [ ] Pastikan CTA tidak membuat halaman blank jika app tidak tersedia.
- [ ] Scan QR dari Syntrix-One dan pastikan masuk ke form validasi.
- [ ] Scan QR device region lain dan pastikan masuk ke region mismatch.
- [ ] Login sebagai validator di web dan pastikan tetap diarahkan ke Syntrix-One sesuai aturan.
- [ ] Login sebagai adminregion/superadmin dan pastikan tidak dapat mengakses form validasi browser.
- [x] Jalankan lint frontend.
- [x] Build app jika ada perubahan parser/deep link app.

## Acceptance Criteria

- [x] Browser QR tidak lagi membuka form validasi.
- [x] Syntrix-One tetap bisa scan QR lama dan baru.
- [x] Validasi hanya bisa submit dari app dengan token validator valid.
- [x] User awam yang scan QR dari kamera HP mendapat instruksi yang jelas.
- [x] Adminregion/superadmin tetap bisa review request, tetapi tidak bisa menjalankan form validasi.
- [x] Tidak ada perubahan skema database untuk fase ini.
